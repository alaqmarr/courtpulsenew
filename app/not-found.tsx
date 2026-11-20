import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#ecfdf5] via-[#f3f6f4] to-[#f0fdfa] text-slate-900 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-4 max-w-md w-full shadow-lg">
        <h1 className="text-xl font-bold text-slate-900">Page not found</h1>
        <p className="text-sm text-slate-500">
          The page you asked for does not exist or may have moved.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
