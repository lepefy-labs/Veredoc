import { safeCallbackPath } from "@/lib/security/redirect";
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isProtected = pathname.startsWith("/analyze") || pathname.startsWith("/dashboard") || pathname.startsWith("/account");
      const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

      if (isProtected && !isLoggedIn) return false;
      if (isAuthPage && isLoggedIn) {
        const destination = safeCallbackPath(request.nextUrl.searchParams.get("callbackUrl"), "/dashboard", request.nextUrl.origin);
        return Response.redirect(new URL(destination, request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
