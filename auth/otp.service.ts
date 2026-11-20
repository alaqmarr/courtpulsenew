import crypto from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, otpTokens, users, type OtpPurpose } from "@courtpulse/database";
import { sendOtpEmail } from "@courtpulse/connections/mailer.connection";

const OTP_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 15 * 1000;
const MAX_ATTEMPTS = 5;

function generateSixDigitCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtpCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

export async function createAndSendOtp(
  rawEmail: string,
  purpose: OtpPurpose
): Promise<{ ok: boolean; message: string; cooldownRemaining?: number }> {
  const email = rawEmail.trim().toLowerCase();
  const user = db.select().from(users).where(eq(users.email, email)).get();

  if (!user) {
    return {
      ok: false,
      message: "No account found for that email address.",
    };
  }

  const recent = db
    .select()
    .from(otpTokens)
    .where(
      and(
        eq(otpTokens.email, email),
        eq(otpTokens.purpose, purpose),
        isNull(otpTokens.consumedAt)
      )
    )
    .orderBy(desc(otpTokens.createdAt))
    .get();

  if (recent) {
    const elapsed = Date.now() - recent.createdAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS && recent.expiresAt.getTime() > Date.now()) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        ok: true,
        cooldownRemaining: waitSeconds,
        message: `A code was already sent to ${email}. Check your inbox or wait ${waitSeconds}s to send a new one.`,
      };
    }
  }

  // Invalidate any previous unconsumed codes for this email + purpose
  db.update(otpTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(otpTokens.email, email),
        eq(otpTokens.purpose, purpose),
        isNull(otpTokens.consumedAt)
      )
    )
    .run();

  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  if (process.env.NODE_ENV !== "production") {
    console.log(`[otp] Verification code for ${email} (${purpose}): ${code}`);
  }

  db.insert(otpTokens)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      email,
      codeHash: hashOtpCode(code),
      purpose,
      expiresAt,
      attempts: 0,
    })
    .run();

  const mailResult = await sendOtpEmail(
    email,
    code,
    purpose === "FIRST_LOGIN_PASSWORD"
  );

  if (!mailResult.sent) {
    console.warn(`[otp] Fallback log for ${email} (${purpose}): ${code}`);
    return {
      ok: false,
      message: "Could not send email right now. Please try again in a moment.",
    };
  }

  return {
    ok: true,
    message: `We sent a 6-digit code to ${email}.`,
  };
}

export function verifyOtpAndConsume(
  rawEmail: string,
  code: string
): { ok: boolean; userId?: string; message?: string } {
  const email = rawEmail.trim().toLowerCase();

  const token = db
    .select()
    .from(otpTokens)
    .where(and(eq(otpTokens.email, email), isNull(otpTokens.consumedAt)))
    .orderBy(desc(otpTokens.createdAt))
    .get();

  if (!token) {
    return {
      ok: false,
      message: "No active code found. Request a new code first.",
    };
  }

  if (token.expiresAt.getTime() < Date.now()) {
    db.update(otpTokens)
      .set({ consumedAt: new Date() })
      .where(eq(otpTokens.id, token.id))
      .run();
    return {
      ok: false,
      message: "That code has expired. Request a new code.",
    };
  }

  if (token.attempts >= MAX_ATTEMPTS) {
    return {
      ok: false,
      message: "Too many wrong attempts. Request a new code.",
    };
  }

  const matches = hashOtpCode(code) === token.codeHash;
  if (!matches) {
    db.update(otpTokens)
      .set({ attempts: token.attempts + 1 })
      .where(eq(otpTokens.id, token.id))
      .run();
    return {
      ok: false,
      message: "Wrong code. Check your email and try again.",
    };
  }

  db.update(otpTokens)
    .set({ consumedAt: new Date() })
    .where(eq(otpTokens.id, token.id))
    .run();

  return {
    ok: true,
    userId: token.userId,
  };
}
