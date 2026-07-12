import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Matches all routes except api, _next/static, _next/image, favicon.ico
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"], // Include api to prepare for rate-limiting
};
