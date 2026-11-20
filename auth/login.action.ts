"use server";

import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { db, users } from "@courtpulse/database";
import { emailSchema } from "@courtpulse/helpers/validation.helpers";
import { signIn } from "./auth.config";
import { createAndSendOtp } from "./otp.service";

export type EmailCheckResult =
  | { status: "INVALID"; message: string }
  | { status: "NOT_FOUND"; email: string; message: string }
  | { status: "NEEDS_PASSWORD_SETUP"; email: string; message: string; otpSent: boolean }
  | { status: "READY"; email: string };

export async function checkEmailStatusAction(rawEmail: string): Promise<EmailCheckResult> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return { status: "INVALID", message: parsed.error.issues[0]?.message || "Enter a valid email." };
  }

  const email = parsed.data;
  const user = db.select().from(users).where(eq(users.email, email)).get();

  if (!user) {
    return {
      status: "NOT_FOUND",
      email,
      message: "No account exists with this email. Create a new account instead.",
    };
  }

  if (!user.passwordHash || user.mustResetPassword) {
    const otpResult = await createAndSendOtp(email, "FIRST_LOGIN_PASSWORD");
    return {
      status: "NEEDS_PASSWORD_SETUP",
      email,
      otpSent: otpResult.ok,
      message: otpResult.ok
        ? `First sign-in detected. We sent a 6-digit code to ${email} so you can set your password.`
        : otpResult.message,
    };
  }

  return { status: "READY", email };
}

export async function loginWithPasswordAction(input: {
  email: string;
  password: string;
}): Promise<{ ok: boolean; needsOtpSetup?: boolean; message?: string }> {
  const parsedEmail = emailSchema.safeParse(input.email);
  if (!parsedEmail.success) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const email = parsedEmail.data;
  const user = db.select().from(users).where(eq(users.email, email)).get();

  if (!user) {
    return { ok: false, message: "No account found with that email." };
  }

  if (!user.passwordHash || user.mustResetPassword) {
    const otpResult = await createAndSendOtp(email, "FIRST_LOGIN_PASSWORD");
    return {
      ok: false,
      needsOtpSetup: true,
      message: otpResult.ok
        ? `One-time setup: we sent a 6-digit code to ${email} so you can save a password for future logins.`
        : otpResult.message,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password: input.password,
      redirect: false,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, message: "Wrong email or password." };
    }
    throw err;
  }
}
