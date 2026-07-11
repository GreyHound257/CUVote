import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { authConfig } from "@/auth.config";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      departmentId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    departmentId?: string | null;
  }
}

import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/validation/auth";
import { logAuditAction } from "./audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = loginSchema.safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;

          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
          });

          if (!user || !user.passwordHash || user.status !== "ACTIVE") {
            // Do not log failed attempts here without IP, handle via middleware/events if needed
            return null;
          }

          const passwordsMatch = await bcrypt.compare(password, user.passwordHash);

          if (passwordsMatch) {
            // Update last login
            await prisma.user.update({
              where: { id: user.id },
              data: { lastLogin: new Date() }
            });

            // Note: Ideal audit logging requires IP, which is tricky in authorize callback.
            // We'll trust the NextAuth event system or log it post-login where request is available.

            return user;
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role as Role;
        session.user.departmentId = token.departmentId as string | null | undefined;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.departmentId = user.departmentId;
      }
      return token;
    },
  },
});
