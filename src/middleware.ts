import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isAdminArea = pathname.startsWith("/admin");
  const isUserArea = pathname.startsWith("/dashboard");
  const isAuthPage = pathname === "/login" || pathname === "/register";

  // already signed in → keep them out of the auth pages
  if (isAuthPage && session) {
    const url = req.nextUrl.clone();
    url.pathname = session.role === "admin" ? "/admin" : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if ((isAdminArea || isUserArea) && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminArea && session?.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/register"],
};
