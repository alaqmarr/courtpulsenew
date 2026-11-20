import Link from "next/link";
import { ArrowLeft, Mail, MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <div className="w-full max-w-2xl space-y-6 cp-fade-up">
      <Link
        href="/packages"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to plans</span>
      </Link>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-5 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.1)]">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Contact &amp; plan support
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Need custom team quotas, league branding, or multi-court tournament onboarding? Reach out directly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="https://wa.me/+919618443558?text=Hi%20CourtPulse%20team%2C%20I%20would%20like%20help%20with%20a%20custom%20plan."
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50 p-4 space-y-1.5 transition-colors"
          >
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp desk</span>
            </div>
            <p className="text-xs text-slate-600">
              Quick plan upgrades &amp; tournament support
            </p>
          </a>

          <a
            href="mailto:support@courtpulse.app"
            className="rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 p-4 space-y-1.5 transition-colors"
          >
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Mail className="w-4 h-4 text-slate-600" />
              <span>Email support</span>
            </div>
            <p className="text-xs text-slate-600">support@courtpulse.app</p>
          </a>
        </div>
      </div>
    </div>
  );
}
