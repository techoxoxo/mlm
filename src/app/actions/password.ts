"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { connection } from "@/lib/redis";
import { sendOtpEmail } from "@/lib/email";
import { hashPassword, getSession } from "@/lib/auth";

const { users } = schema;

export async function sendResetPasswordOtpAction(email: string): Promise<{ ok: boolean; error?: string; devMode?: boolean }> {
  try {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { ok: false, error: "Please enter a valid email address" };
    }

    const user = await db.query.users.findFirst({ where: eq(users.email, cleanEmail) });
    if (!user) {
      return { ok: false, error: "No account found with this email address" };
    }

    const emailEnabled = process.env.EMAIL_OTP_ENABLED !== "false";

    if (!emailEnabled) {
      // Dev/test mode: store fixed OTP 123456, skip email dispatch
      await connection.set(`otp_reset:${cleanEmail}`, "123456", "EX", 900);
      console.log(`[PASSWORD RESET - DEV] Target: ${cleanEmail} | Code: 123456`);
      return { ok: true, devMode: true };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await connection.set(`otp_reset:${cleanEmail}`, otp, "EX", 900);

    const sent = await sendOtpEmail(cleanEmail, otp);
    if (!sent) return { ok: false, error: "Failed to dispatch verification email" };

    return { ok: true };
  } catch (err) {
    console.error("sendResetPasswordOtpAction failed:", err);
    return { ok: false, error: (err as Error).message };
  }
}

export async function resetPasswordAction(email: string, otp: string, pass: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanOtp = String(otp || "").trim();
    const cleanPass = String(pass || "");

    if (!cleanEmail || !cleanOtp || !cleanPass) {
      return { ok: false, error: "All fields are required" };
    }
    if (cleanPass.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters long" };
    }

    const savedOtp = await connection.get(`otp_reset:${cleanEmail}`);
    if (!savedOtp || savedOtp !== cleanOtp) {
      return { ok: false, error: "Invalid or expired verification code" };
    }

    // Hash and update
    const pwHash = await hashPassword(cleanPass);
    await db.update(users).set({ passwordHash: pwHash }).where(eq(users.email, cleanEmail));

    // Clear OTP
    await connection.del(`otp_reset:${cleanEmail}`);

    return { ok: true };
  } catch (err) {
    console.error("resetPasswordAction failed:", err);
    return { ok: false, error: (err as Error).message };
  }
}

export async function changePasswordAction(otp: string, pass: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || !session.uid) {
      return { ok: false, error: "Not authenticated" };
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, session.uid) });
    if (!user) return { ok: false, error: "User not found" };

    const cleanOtp = String(otp || "").trim();
    const cleanPass = String(pass || "");

    if (!cleanOtp || !cleanPass) {
      return { ok: false, error: "All fields are required" };
    }
    if (cleanPass.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters long" };
    }

    const savedOtp = await connection.get(`otp:${user.email.toLowerCase()}`);
    if (!savedOtp || savedOtp !== cleanOtp) {
      return { ok: false, error: "Invalid or expired verification code" };
    }

    // Hash and update
    const pwHash = await hashPassword(cleanPass);
    await db.update(users).set({ passwordHash: pwHash }).where(eq(users.id, user.id));

    // Clear OTP
    await connection.del(`otp:${user.email.toLowerCase()}`);

    return { ok: true };
  } catch (err) {
    console.error("changePasswordAction failed:", err);
    return { ok: false, error: (err as Error).message };
  }
}
