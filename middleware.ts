export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/analyze", "/analyze/:path*", "/dashboard", "/dashboard/:path*"],
};
