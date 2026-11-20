"use client";

import Link from "next/link";
import { Check, MessageSquare } from "lucide-react";
import type { PackageType } from "@courtpulse/database/schema.enums";
import { PACKAGE_PLANS } from "@courtpulse/helpers/quota.helpers";

export function PackagesView({
  currentPlan,
  userEmail,
}: {
  currentPlan: PackageType;
  userEmail?: string;
}) {
  return (
    <div className="w-full space-y-6 cp-fade-up">
      <div>
        <h1 className="text-2xl sm:text-[30px] font-bold text-slate-900">Plans</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pick a plan based on how many teams and tournaments you run.
        </p>
      </div>

      <section className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PACKAGE_PLANS.map((plan) => {
          const isActive = currentPlan === plan.type;
          const isFreeTier = plan.type === "FREE";
          const waText = userEmail
            ? `Hi CourtPulse team, I want to upgrade account (${userEmail}) to the ${plan.title}.`
            : `Hi CourtPulse team, I want to upgrade to the ${plan.title} on CourtPulse.`;

          return (
            <div
              key={plan.type}
              className={`rounded-2xl p-6 flex flex-col justify-between gap-6 border shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${
                isActive
                  ? "bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 border-emerald-400"
                  : "bg-white border-slate-200/90"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{plan.title}</h2>
                  {isActive && (
                    <span className="text-xs font-bold text-emerald-700">
                      Current
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-500">{plan.summary}</p>
                <p className="font-display text-3xl font-extrabold tracking-[-0.03em] text-slate-900">
                  {plan.priceLabel}
                </p>

                <ul className="space-y-2 text-sm text-slate-700 pt-3 border-t border-slate-100">
                  {plan.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {isActive ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-4 text-sm font-semibold border border-emerald-200 text-emerald-800 rounded-lg bg-emerald-50/70"
                >
                  Active plan
                </button>
              ) : isFreeTier ? (
                <Link
                  href="/contact"
                  className="block text-center w-full py-2.5 px-4 text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  Contact support
                </Link>
              ) : (
                <a
                  href={`https://wa.me/+919618443558?text=${encodeURIComponent(
                    waText
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Request upgrade</span>
                </a>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
