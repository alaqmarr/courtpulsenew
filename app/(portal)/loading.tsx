export default function PortalLoading() {
  return (
    <div className="w-full space-y-5 cp-fade-up">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600" />
        </span>
        <div className="h-7 w-48 bg-slate-200/80 rounded-lg animate-pulse" />
      </div>
      <div className="w-full h-24 bg-gradient-to-r from-emerald-950/10 via-emerald-700/15 to-teal-700/10 rounded-2xl animate-pulse" />
      <div className="w-full h-64 bg-white border border-slate-200/80 rounded-2xl animate-pulse" />
    </div>
  );
}
