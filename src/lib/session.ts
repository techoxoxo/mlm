import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

// Edge-safe session helpers (jose only — no bcrypt, no next/headers).

export const COOKIE = "mlm_session";
const secret = new TextEncoder().encode(env.JWT_SECRET);

export type Session = {
  uid: string;
  role: "user" | "admin";
  email: string;
};

export async function createSessionToken(s: Session) {
  return new SignJWT(s as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      uid: payload.uid as string,
      role: payload.role as Session["role"],
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}
