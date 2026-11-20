"use server";

import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, teamMembers, users } from "@courtpulse/database";
import { emailSchema, passwordSchema } from "@courtpulse/helpers/validation.helpers";
import { signIn } from "./auth.config";
import { createAndSendOtp } from "./otp.service";
import { hashPassword } from "./password.helpers";

export async function registerAction(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ ok: boolean; needsOtpSetup?: boolean; message?: string }> {
  const cleanName = input.name.trim();
  if (cleanName.length < 2) {
    return { ok: false, message: "Enter your name (at least 2 characters)." };
  }

  const parsedEmail = emailSchema.safeParse(input.email);
  if (!parsedEmail.success) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const parsedPassword = passwordSchema.safeParse(input.password);
  if (!parsedPassword.success) {
    return {
      ok: false,
      message: parsedPassword.error.issues[0]?.message || "Password must be at least 8 characters.",
    };
  }

  const email = parsedEmail.data;
  const existing = db.select().from(users).where(eq(users.email, email)).get();

  if (existing) {
    if (!existing.passwordHash || existing.mustResetPassword) {
      const otpResult = await createAndSendOtp(email, "FIRST_LOGIN_PASSWORD");
      return {
        ok: false,
        needsOtpSetup: true,
        message: otpResult.ok
          ? `An account already exists for ${email}. We sent a 6-digit code to verify your email and set your password.`
          : otpResult.message,
      };
    }

    return {
      ok: false,
      message: "An account with this email already exists. Sign in instead.",
    };
  }

  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(parsedPassword.data);

  db.insert(users)
    .values({
      id: userId,
      email,
      name: cleanName,
      displayName: cleanName,
      passwordHash,
      mustResetPassword: false,
      packageType: "FREE",
      teamQuota: 1,
      tournamentQuota: 1,
    })
    .run();

  db.update(teamMembers)
    .set({
      userId,
      displayName: cleanName,
    })
    .where(and(eq(teamMembers.email, email), isNull(teamMembers.userId)))
    .run();

  await signIn("credentials", {
    email,
    password: parsedPassword.data,
    redirect: false,
  });

  return { ok: true };
}
