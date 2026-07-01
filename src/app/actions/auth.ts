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
import { chargeRegistration } from "@/lib/distribution";
import { enqueueActivationAsync } from "@/lib/queue";
import { rateLimit, clientIp } from "@/lib/ratelimit";

import { connection } from "@/lib/redis";
import { sendOtpEmail } from "@/lib/email";

const { users } = schema;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name too short").max(80, "Name too long"),
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(8, "Password must be 8+ characters"),
  ref: z.string().trim().optional(),
});

export type ActionState = { error?: string } | null;

// only allow internal redirect targets like "/dashboard/network"
function safeNext(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function isUniqueViolation(e: unknown): { constraint?: string } | null {
  const err = e as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  if (err?.code === "23505") return { constraint: err.constraint };
  if (err?.cause?.code === "23505") return { constraint: err.cause.constraint };
  return null;
}

export async function sendOtpAction(email: string): Promise<{ ok: boolean; error?: string }> {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { ok: false, error: "Please enter a valid email address" };
  }

  const ip = await clientIp();
  const rl = await rateLimit(`otp:${ip}`, 3, 300); // 3 OTP requests / 5 min / IP
  if (!rl.ok) return { ok: false, error: `Too many attempts. Try again in ${rl.retryAfter}s.` };

  const existing = await db.query.users.findFirst({ where: eq(users.email, cleanEmail) });
  if (existing) return { ok: false, error: "Email already registered" };

  const emailEnabled = process.env.EMAIL_OTP_ENABLED !== "false";

  if (!emailEnabled) {
    // Dev/test mode: store fixed OTP 123456, skip email
    await connection.set(`otp:${cleanEmail}`, "123456", "EX", 900);
    return { ok: true };
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await connection.set(`otp:${cleanEmail}`, otp, "EX", 900);

  const sent = await sendOtpEmail(cleanEmail, otp);
  if (!sent) return { ok: false, error: "Failed to dispatch verification email" };

  return { ok: true };
}

export async function registerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const rl = await rateLimit(`register:${ip}`, 5, 600); // 5 signups / 10 min / IP
  if (!rl.ok) return { error: `Too many attempts. Try again in ${rl.retryAfter}s.` };

  const parsed = registerSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
    ref: form.get("ref") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { name, password, ref } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const otp = String(form.get("otp") || "").trim();
  if (!otp) return { error: "Verification code is required" };

  const savedOtp = await connection.get(`otp:${email}`);
  if (!savedOtp || savedOtp !== otp) {
    return { error: "Invalid or expired verification code" };
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return { error: "Email already registered" };

  const firstUser = await db.select({ id: users.id }).from(users).limit(1);
  const isFirstUser = firstUser.length === 0;

  let sponsorId: string | null = null;
  if (!isFirstUser) {
    if (!ref) {
      return { error: "Referral code is required" };
    }
    const sponsor = await db.query.users.findFirst({ where: eq(users.referralCode, ref.toUpperCase()) });
    if (!sponsor) {
      return { error: "Invalid referral code. Please check your sponsor link or code." };
    }
    sponsorId = sponsor.id;
  }

  const passwordHash = await hashPassword(password);

  // retry a few times: covers the (rare) referral-code collision and the
  // duplicate-email race where two signups pass the check above together
  let created: typeof users.$inferSelect | null = null;
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    try {
      created = await db.transaction(async (tx) => {
        const [u] = await tx
          .insert(users)
          .values({
            name,
            email,
            passwordHash,
            sponsorId,
            referralCode: genReferralCode(),
            status: "registered",
          })
          .returning();
        return u;
      });
    } catch (e) {
      const unique = isUniqueViolation(e);
      if (!unique) throw e;
      if (unique.constraint?.includes("email")) return { error: "Email already registered" };
      // referral-code collision → loop and mint a new code
    }
  }
  if (!created) return { error: "Could not create account, please try again" };

  await connection.del(`otp:${email}`);
  await setSession({ uid: created.id, role: created.role, email: created.email });
  // Purge cached pages so dashboard loads fresh data for this user
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const rl = await rateLimit(`login:${ip}`, 10, 300); // 10 attempts / 5 min / IP
  if (!rl.ok) return { error: `Too many attempts. Try again in ${rl.retryAfter}s.` };

  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  if (!email || !password) return { error: "Email and password required" };

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password" };
  }

  await setSession({ uid: user.id, role: user.role, email: user.email });
  // Purge cached pages so dashboard loads fresh data for this user
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/", "layout");

  const fallback = user.role === "admin" ? "/admin" : "/dashboard";
  const next = safeNext(form.get("next"));
  // never bounce a non-admin into the admin area (middleware would eject them anyway)
  const target = next && !(next.startsWith("/admin") && user.role !== "admin") ? next : fallback;
  redirect(target);
}

export async function logoutAction() {
  await clearSession();
  // Purge all cached server component data so the next user doesn't see stale pages
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/", "layout");
  redirect("/login");
}
