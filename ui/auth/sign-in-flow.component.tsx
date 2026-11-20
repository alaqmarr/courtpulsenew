"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { sileo } from "sileo";
import { loginWithPasswordAction } from "@courtpulse/auth/login.action";
import {
  completeOtpPasswordSetupAction,
  requestPasswordOtpAction,
} from "@courtpulse/auth/otp.action";
import { BrandLogo } from "@courtpulse/ui/primitives/brand-logo.component";

type AuthStep = "SIGN_IN" | "OTP_RESET";

export function SignInFlow({
  initialEmail = "",
  initialStep = "SIGN_IN",
}: {
  initialEmail?: string;
  initialStep?: AuthStep;
}) {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [infoText, setInfoText] = useState<string | null>(
    initialStep === "OTP_RESET" && initialEmail
      ? `Check ${initialEmail} for your 6-digit code, or click Send a new code.`
      : null
  );

  const loginMutation = useMutation({
    mutationFn: () => loginWithPasswordAction({ email, password }),
    onSuccess: (res) => {
      if (res.needsOtpSetup) {
        if (password.length >= 8 && !newPassword) {
          setNewPassword(password);
        }
        setStep("OTP_RESET");
        setInfoText(res.message || null);
        sileo.info({ title: "One-time password setup", description: res.message });
        return;
      }
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not sign in." });
        return;
      }
      sileo.success({ title: "Signed in" });
      router.push("/");
      router.refresh();
    },
    onError: () => sileo.error({ title: "Sign in failed." }),
  });

  const requestOtpMutation = useMutation({
    mutationFn: () => requestPasswordOtpAction(email),
    onSuccess: (res) => {
      if (res.ok) {
        setStep("OTP_RESET");
        setInfoText(res.message);
        sileo.success({ title: "Code sent", description: res.message });
      } else {
        sileo.error({ title: res.message });
      }
    },
    onError: () => sileo.error({ title: "Could not send code right now." }),
  });

  const completeOtpMutation = useMutation({
    mutationFn: () =>
      completeOtpPasswordSetupAction({
        email,
        code: otpCode,
        newPassword,
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not save password." });
        return;
      }
      sileo.success({ title: "Password saved" });
      router.push("/");
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not save password." }),
  });

  function handleRequestResetCode() {
    if (!email.trim()) {
      const msg = "Enter your email address first, then click Forgot password.";
      setInfoText(msg);
      sileo.error({ title: msg });
      return;
    }
    requestOtpMutation.mutate();
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#ecfdf5] via-[#f3f6f4] to-[#f0fdfa] text-slate-900 flex flex-col justify-between p-6 sm:p-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <BrandLogo size="sm" textClassName="font-bold text-base text-slate-900" />
        </Link>
        <Link
          href="/sign-up"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
        >
          Create account
        </Link>
      </div>

      <div className="w-full flex items-center justify-center py-8">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-7 sm:p-8 space-y-6 shadow-[0_12px_40px_-14px_rgba(6,78,59,0.16)]">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">
              {step === "OTP_RESET" ? "Set your password" : "Sign in"}
            </h1>
            <p className="text-sm text-slate-500">
              {step === "SIGN_IN" && "Enter your email and password to jump back in."}
              {step === "OTP_RESET" && `Enter the 6-digit code sent to ${email}`}
            </p>
          </div>

          {infoText && (
            <div className="p-3 text-sm bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
              {infoText}
            </div>
          )}

          {step === "SIGN_IN" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setInfoText(null);
                loginMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleRequestResetCode}
                    disabled={requestOtpMutation.isPending}
                    className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer"
                  >
                    {requestOtpMutation.isPending ? "Sending code..." : "Forgot password?"}
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleRequestResetCode}
                  disabled={requestOtpMutation.isPending}
                  className="text-xs text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  First sign-in or need a reset code? Verify with email code
                </button>
              </div>
            </form>
          )}

          {step === "OTP_RESET" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                completeOtpMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label htmlFor="otpCode" className="block text-sm font-medium text-slate-700">
                  6-digit code
                </label>
                <input
                  id="otpCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full px-3.5 py-2.5 text-lg tracking-[0.35em] font-mono-nums bg-slate-50/60 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">
                  New password (8+ characters)
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Choose a password"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={completeOtpMutation.isPending}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                {completeOtpMutation.isPending
                  ? "Saving..."
                  : "Save password and sign in"}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("SIGN_IN");
                    setOtpCode("");
                    setNewPassword("");
                    setInfoText(null);
                  }}
                  className="text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  Back to password sign in
                </button>
                <button
                  type="button"
                  onClick={() => requestOtpMutation.mutate()}
                  disabled={requestOtpMutation.isPending}
                  className="font-medium text-emerald-700 hover:underline cursor-pointer"
                >
                  {requestOtpMutation.isPending ? "Sending..." : "Send a new code"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-slate-500">
        New to CourtPulse?{" "}
        <Link href="/sign-up" className="font-medium text-emerald-700 hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}
