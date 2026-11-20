interface WinRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  tone?: "light" | "on-gradient";
}

export function WinRing({
  percent,
  size = 68,
  strokeWidth = 5,
  label,
  tone = "light",
}: WinRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const trackColor =
    tone === "on-gradient" ? "rgba(255, 255, 255, 0.22)" : "#e2e8f0";
  const progressColor =
    tone === "on-gradient"
      ? "#6ee7b7"
      : clamped >= 50
      ? "#059669"
      : clamped > 0
      ? "#d97706"
      : "#cbd5e1";
  const textColor = tone === "on-gradient" ? "text-white" : "text-slate-900";
  const subColor = tone === "on-gradient" ? "text-emerald-100/80" : "text-slate-500";

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xs font-bold font-mono-nums leading-none ${textColor}`}>
          {Math.round(clamped)}%
        </span>
        {label && (
          <span className={`text-[9px] mt-0.5 leading-none ${subColor}`}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
