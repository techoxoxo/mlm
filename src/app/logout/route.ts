import { NextRequest, NextResponse } from "next/server";
import { COOKIE } from "@/lib/session";

// GET /logout — clears the session cookie and lands on /login.
// Used both by the "log out" control and as the escape hatch when a session
// references a user that no longer exists (avoids a /login⇄/dashboard loop).
export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  res.cookies.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
