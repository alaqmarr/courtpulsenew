interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  textClassName?: string;
}

const SIZE_CLASSES = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

export function BrandLogo({
  size = "sm",
  showText = true,
  textClassName = "font-bold text-slate-900 tracking-tight",
}: BrandLogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img
        src="/icons/icon-192x192.png"
        alt="CourtPulse logo"
        width={40}
        height={40}
        className={`${SIZE_CLASSES[size]} rounded-lg object-cover shrink-0 shadow-xs`}
      />
      {showText && (
        <span className={`font-display tracking-[-0.025em] ${textClassName}`}>
          CourtPulse
        </span>
      )}
    </span>
  );
}
