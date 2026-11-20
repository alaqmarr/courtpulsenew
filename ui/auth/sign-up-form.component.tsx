"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { sileo } from "sileo";
import { registerAction } from "@courtpulse/auth/register.action";
import { BrandLogo } from "@courtpulse/ui/primitives/brand-logo.component";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerMutation = useMutation({
    mutationFn: () => registerAction({ name, email, password }),
    onSuccess: (res) => {
      if (res.needsOtpSetup) {
        sileo.info({
          title: "Account already exists",
          description: res.message,
        });
        router.push(
          `/sign-in?email=${encodeURIComponent(email.trim().toLowerCase())}&step=otp`
        );
        return;
      }
      if (!res.ok) {
        sileo.error({ title: res.message || "Could not create account." });
        return;
      }
      sileo.success({ title: "Account created" });
      router.push("/");
      router.refresh();
    },
    onError: () => sileo.error({ title: "Could not create account." }),
  });

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#ecfdf5] via-[#f3f6f4] to-[#f0fdfa] text-slate-900 flex flex-col justify-between p-6 sm:p-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <BrandLogo size="sm" textClassName="font-bold text-base text-slate-900" />
        </Link>
        <Link
          href="/sign-in"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
        >
          Sign in
        </Link>
      </div>

      <div className="w-full flex items-center justify-center py-8">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-7 sm:p-8 space-y-6 shadow-[0_12px_40px_-14px_rgba(6,78,59,0.16)]">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
            <p className="text-sm text-slate-500">
              Set up your player profile in seconds.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              registerMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Your name
              </label>
              <input
                id="name"
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Kumar"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password (8+ characters)
              </label>
              <input
                id="password"
                type="password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {registerMutation.isPending ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-emerald-700 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
