"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";
import { activate, decideChoice } from "@/lib/distribution";

const { users } = schema;

/**
 * Activate a user into Slab 1.
 * Calls the distribution engine directly — no queue, no timeout risk.
 */
export async function activateAction() {
  const s = await getSession();
  if (!s) return { error: "Not authenticated" };
  const user = await db.query.users.findFirst({ where: eq(users.id, s.uid) });
  if (!user) return { error: "User not found" };
  if (user.status === "registered") return { error: "Account not activated. Please complete activation payment first." };
  if (user.currentSlab !== 0) return { error: "Already activated" };

  try {
    await activate(s.uid);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Handle exit or upgrade decision.
 * Calls the distribution engine directly — no queue, no timeout risk.
 */
export async function decideAction(choice: "exit" | "upgrade", otp?: string) {
  const s = await getSession();
  if (!s) return { error: "Not authenticated" };
  const user = await db.query.users.findFirst({ where: eq(users.id, s.uid) });
  if (!user) return { error: "User not found" };
  if (user.status === "registered") return { error: "Account not activated. Please complete activation payment first." };

  if (choice === "exit") {
    const trimmedOtp = String(otp || "").trim();
    if (!trimmedOtp) {
      return { error: "Verification code is required to take exit" };
    }

    const { connection } = await import("@/lib/redis");
    const savedOtp = await connection.get(`otp:${user.email.toLowerCase()}`);
    if (!savedOtp || savedOtp !== trimmedOtp) {
      return { error: "Invalid or expired verification code" };
    }

    // Purge the OTP to prevent reuse
    await connection.del(`otp:${user.email.toLowerCase()}`);
  }

  try {
    await decideChoice(s.uid, choice);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}
