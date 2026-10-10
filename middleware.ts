import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { buildLoginRedirectPath } from "@/lib/security/redirect";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const { pathname } = req.nextUrl;

  if (isLoggedIn && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  const isProtected = pathname.startsWith("/analyze") || pathname.startsWith("/dashboard") || pathname.startsWith("/account");

  if (isProtected && !isLoggedIn) {
    // Conserva la destinazione (es. link email al report) per il ritorno dopo il login.
    return NextResponse.redirect(new URL(buildLoginRedirectPath(pathname, req.nextUrl.search), req.nextUrl));
  }
  // Nessun redirect da /login e /register per chi ha un cookie di sessione: il cookie può
  // appartenere a una sessione invalidata (cambio password, account eliminato) che solo il
  // server riconosce. Le pagine di accesso reindirizzano lato client se la sessione è valida.
});

export const config = {
  matcher: ["/", "/analyze", "/analyze/:path*", "/dashboard", "/dashboard/:path*", "/account", "/account/:path*", "/login", "/register"],
};
