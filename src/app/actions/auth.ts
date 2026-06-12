"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import {
  hashPassword,
  verifyPassword,
  setSession,
  clearSession,
  genReferralCode,
} from "@/lib/auth";
import { chargeJoinFee } from "@/lib/distribution";

const { users } = schema;

const registerSchema = z.object({
  name: z.string().min(2, "Name too short"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be 6+ characters"),
  ref: z.string().optional(),
});

export type ActionState = { error?: string } | null;

export async function registerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
    ref: form.get("ref") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { name, email, password, ref } = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (existing) return { error: "Email already registered" };

  let sponsorId: string | null = null;
  if (ref) {
    const sponsor = await db.query.users.findFirst({ where: eq(users.referralCode, ref.toUpperCase()) });
    if (sponsor) sponsorId = sponsor.id;
  }

  const created = await db.transaction(async (tx) => {
    const [u] = await tx
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        sponsorId,
        referralCode: genReferralCode(),
        status: "registered",
      })
      .returning();
    await chargeJoinFee(tx, u.id);
    return u;
  });

  await setSession({ uid: created.id, role: created.role, email: created.email });
  redirect("/dashboard");
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") || "").toLowerCase();
  const password = String(form.get("password") || "");
  if (!email || !password) return { error: "Email and password required" };

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password" };
  }

  await setSession({ uid: user.id, role: user.role, email: user.email });
  redirect(user.role === "admin" ? "/admin" : "/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
