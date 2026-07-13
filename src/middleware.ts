import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Exclude Next.js internals AND all API routes so Auth.js / route handlers
  // are not intercepted (matching /api causes /api/auth/session HTML 404s).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
