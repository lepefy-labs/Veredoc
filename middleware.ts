import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/analyze", "/analyze/:path*", "/dashboard", "/dashboard/:path*", "/login", "/register"],
};
