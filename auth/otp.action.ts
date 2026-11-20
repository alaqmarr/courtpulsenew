"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db, teamMembers, users } from "@courtpulse/database";
import {
  emailSchema,
  otpCodeSchema,
  passwordSchema,
} from "@courtpulse/helpers/validation.helpers";
import { signIn } from "./auth.config";
import { createAndSendOtp, verifyOtpAndConsume } from "./otp.service";
import { hashPassword } from "./password.helpers";

export async function requestPasswordOtpAction(rawEmail: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const parsedEmail = emailSchema.safeParse(rawEmail);
  if (!parsedEmail.success) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const email = parsedEmail.data;
  const user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user) {
    return { ok: false, message: "No account found for that email address." };
  }

  const purpose =
    !user.passwordHash || user.mustResetPassword
      ? "FIRST_LOGIN_PASSWORD"
      : "PASSWORD_RESET";

  return createAndSendOtp(email, purpose);
}

export async function completeOtpPasswordSetupAction(input: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ ok: boolean; message?: string }> {
  const parsedEmail = emailSchema.safeParse(input.email);
  if (!parsedEmail.success) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const parsedCode = otpCodeSchema.safeParse(input.code);
  if (!parsedCode.success) {
    return {
      ok: false,
      message: parsedCode.error.issues[0]?.message || "Enter the 6-digit code.",
    };
  }

  const parsedPassword = passwordSchema.safeParse(input.newPassword);
  if (!parsedPassword.success) {
    return {
      ok: false,
      message: parsedPassword.error.issues[0]?.message || "Choose a longer password.",
    };
  }

  const email = parsedEmail.data;
  const verification = verifyOtpAndConsume(email, parsedCode.data);
  if (!verification.ok || !verification.userId) {
    return {
      ok: false,
      message: verification.message || "Could not verify the code.",
    };
  }

  const passwordHash = hashPassword(parsedPassword.data);

  db.update(users)
    .set({
      passwordHash,
      mustResetPassword: false,
      emailVerifiedAt: new Date(),
    })
    .where(eq(users.id, verification.userId))
    .run();

  // Ensure any orphan team memberships for this email link to this user
  const userRow = db.select().from(users).where(eq(users.id, verification.userId)).get();
  if (userRow) {
    db.update(teamMembers)
      .set({
        userId: userRow.id,
        displayName: userRow.displayName || userRow.name || undefined,
      })
      .where(and(eq(teamMembers.email, email), isNull(teamMembers.userId)))
      .run();
  }

  await signIn("credentials", {
    email,
    password: parsedPassword.data,
    redirect: false,
  });

  return { ok: true };
}
