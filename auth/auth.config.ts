import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db, users } from "@courtpulse/database";
import { authEdgeConfig } from "./auth.edge";
import { verifyPassword } from "./password.helpers";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authEdgeConfig,
  providers: [
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email;
        const rawPassword = credentials?.password;
        if (typeof rawEmail !== "string" || typeof rawPassword !== "string") {
          return null;
        }

        const email = rawEmail.trim().toLowerCase();
        const user = db.select().from(users).where(eq(users.email, email)).get();

        if (!user || !user.passwordHash || user.mustResetPassword) {
          return null;
        }

        const valid = verifyPassword(rawPassword, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.name || user.email.split("@")[0],
          image: user.image || user.avatarUrl || undefined,
        };
      },
    }),
  ],
});
