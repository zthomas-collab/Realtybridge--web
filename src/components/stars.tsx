
import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Stars({ value, size = 16, className }: { value: number | null; size?: number; className?: string }) {
  const v = value ?? 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={value == null ? "No rating" : `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, v - (i - 1)));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-slate-200" fill="currentColor" strokeWidth={0} style={{ width: size, height: size }} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="text-amber-400" fill="currentColor" strokeWidth={0} style={{ width: size, height: size }} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function RatingInline({ avg, count, size = 14 }: { avg: number | null; count: number; size?: number }) {
  if (!count) return <span className="text-xs text-muted">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Stars value={avg} size={size} />
      <span className="font-medium text-ink">{avg?.toFixed(1)}</span>
      <span className="text-muted">({count})</span>
    </span>
  );
}

export function StarInput({ value, onChange, size = 28, label }: { value: number; onChange: (v: number) => void; size?: number; label: string }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const words = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label={label} className="flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(i)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star className={i <= shown ? "text-amber-400" : "text-slate-200"} fill="currentColor" strokeWidth={0} style={{ width: size, height: size }} />
          </button>
        ))}
      </div>
      <span className="w-16 text-sm text-muted">{words[shown]}</span>
    </div>
  );
}
