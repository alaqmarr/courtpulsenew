import nodemailer from "nodemailer";

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendMail(
  input: SendMailInput
): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[mailer] SMTP credentials missing:", input.to, input.subject);
    return { sent: false, error: "Email settings are not configured." };
  }

  const from =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "CourtPulse <noreply@courtpulse.local>";

  try {
    const info = await transporter.sendMail({
      from,
      replyTo: process.env.SMTP_USER || from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    console.log("[mailer] Sent email:", {
      to: input.to,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email.";
    console.error("[mailer] Failed to send email:", message);
    return { sent: false, error: message };
  }
}

export async function sendOtpEmail(
  email: string,
  code: string,
  isFirstLogin: boolean
) {
  const heading = isFirstLogin
    ? "Set your CourtPulse password"
    : "Reset your CourtPulse password";

  const intro = isFirstLogin
    ? "Use this 6-digit code to set your password on CourtPulse:"
    : "Use this 6-digit code to reset your password on CourtPulse:";

  const text = `${heading}\n\n${intro} ${code}\n\nThis code expires in 15 minutes.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; color: #111814;">
      <p style="margin: 0 0 12px; font-size: 16px; font-weight: 700;">${heading}</p>
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #3a473e;">${intro}</p>
      <p style="margin: 0 0 16px; font-size: 24px; font-weight: 700; letter-spacing: 4px; color: #14532d;">${code}</p>
      <p style="margin: 0; font-size: 12px; color: #526056;">This code expires in 15 minutes.</p>
    </div>
  `;

  return sendMail({
    to: email,
    subject: `CourtPulse verification code: ${code}`,
    text,
    html,
  });
}
