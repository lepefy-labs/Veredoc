import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { buildLoginRedirectPath, safeCallbackPath } from "@/lib/security/redirect";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const { pathname } = req.nextUrl;

  if (isLoggedIn && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  const isProtected = pathname.startsWith("/analyze") || pathname.startsWith("/dashboard");
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  if (isProtected && !isLoggedIn) {
    // Conserva la destinazione (es. link email al report) per il ritorno dopo il login.
    return NextResponse.redirect(new URL(buildLoginRedirectPath(pathname, req.nextUrl.search), req.nextUrl));
  }
  if (isAuthPage && isLoggedIn) {
    const destination = safeCallbackPath(req.nextUrl.searchParams.get("callbackUrl"), "/dashboard", req.nextUrl.origin);
    return NextResponse.redirect(new URL(destination, req.nextUrl));
  }
});

export const config = {
  matcher: ["/", "/analyze", "/analyze/:path*", "/dashboard", "/dashboard/:path*", "/login", "/register"],
};
