import Link from "@/lib/next/link";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  icon,
  sub,
  href,
  tone = "blue",
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
  tone?: "blue" | "green" | "amber" | "violet" | "slate" | "rose";
}) {
  const tones = {
    blue: "bg-brand-50 text-brand-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    slate: "bg-slate-100 text-slate-600",
    rose: "bg-rose-50 text-rose-600",
  };
  const body = (
    <div className={cn("flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-white p-5 transition-shadow", href && "hover:border-brand-200 hover:shadow-md")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
        <span className={cn("flex size-9 items-center justify-center rounded-lg [&_svg]:size-[18px]", tones[tone])}>{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-ink tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-sm text-muted">{sub}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
