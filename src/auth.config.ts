import type { NextAuthConfig, User } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      // The authorization logic is implemented in auth.ts which runs in the Node runtime,
      // as Edge runtime (which this file can run in) does not support bcrypt/Prisma seamlessly yet.
      authorize: undefined as unknown as (credentials: Partial<Record<"email" | "password", unknown>>, request: Request) => Promise<User | null>
    })
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // Protect these routes
      const protectedPaths = ["/dashboard", "/departments", "/users", "/profile", "/settings"];
      const isProtectedRoute = protectedPaths.some(path => nextUrl.pathname.startsWith(path));

      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isSetup = nextUrl.pathname.startsWith("/setup");
      const isOnboarding = nextUrl.pathname.startsWith("/onboarding");

      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn && (isOnLogin || isSetup || isOnboarding)) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
