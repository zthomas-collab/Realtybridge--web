
import { Check } from "lucide-react";
import { REALTOR_SERVICES, SERVICE_LABEL, sortServices } from "@/lib/domain/services";
import type { RealtorService } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Read-only chips of the services a realtor works on. `highlight` marks the ones relevant to a post. */
export function ServiceChips({ services, highlight = [], className }: { services: RealtorService[]; highlight?: RealtorService[]; className?: string }) {
  if (!services.length) return null;
  return (
    <span className={cn("flex flex-wrap gap-1.5", className)}>
      {sortServices(services).map((s) => {
        const hit = highlight.includes(s);
        return (
          <span
            key={s}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
              hit ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-200 bg-slate-50 text-slate-700",
            )}
          >
            {hit && <Check className="size-3" />}
            {SERVICE_LABEL[s]}
          </span>
        );
      })}
    </span>
  );
}

/** Multi-select for the realtor profile: pick any combination of services. */
export function ServicePicker({ value, onChange, invalid }: { value: RealtorService[]; onChange: (v: RealtorService[]) => void; invalid?: boolean }) {
  const toggle = (s: RealtorService) => onChange(value.includes(s) ? value.filter((x) => x !== s) : sortServices([...value, s]));
  return (
    <div role="group" aria-label="Services you offer" className="grid gap-2 sm:grid-cols-2">
      {REALTOR_SERVICES.map((s) => {
        const on = value.includes(s.value);
        return (
          <button
            key={s.value}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(s.value)}
            className={cn(
              "flex items-start gap-3 rounded-[var(--radius-card)] border bg-white p-3 text-left transition-colors",
              on ? "border-brand-600 ring-3 ring-brand-100" : invalid ? "border-red-300" : "border-border hover:border-brand-200",
            )}
          >
            <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border", on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300")}>
              {on && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span>
              <span className="block text-sm font-medium text-ink">{s.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{s.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
