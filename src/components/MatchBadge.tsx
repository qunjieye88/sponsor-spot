interface MatchBadgeProps {
  score: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  hideLabel?: boolean;

export function MatchBadge({ score, size = "md", className }: MatchBadgeProps) {
  const isStrong = score >= 85;
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (score / 100) * circumference;

  const sizeMap = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-20 w-20",
  };

  const textSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={`flex flex-col items-center gap-1 ${className || ""}`}>
      <div className={`relative ${sizeMap[size]}`}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="3"
          />
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke={isStrong ? "hsl(var(--primary))" : "hsl(var(--accent))"}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-bold tabular-nums ${textSize[size]}`}>
          {score}%
        </span>
      </div>
      {isStrong && (
        <span className="px-2 py-0.5 rounded-pill bg-primary/10 text-primary text-xs font-semibold">
          Strong Match
        </span>
      )}
    </div>
  );
}
