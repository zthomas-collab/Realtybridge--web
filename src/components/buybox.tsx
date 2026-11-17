import { Check } from "lucide-react";
import { BUYBOX_DEAL_TYPES, BUYBOX_PROPERTY_TYPES, PROPERTY_TYPE_LABEL, toggleBuyBoxDealType } from "@/lib/domain/buybox";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function BuyBoxDealTypePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div role="group" aria-label="Deal types you buy" className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {BUYBOX_DEAL_TYPES.map((type) => (
        <label key={type.value} className="flex cursor-pointer items-center gap-3 py-1 text-sm font-medium text-ink">
          <Checkbox checked={value.includes(type.value)} onCheckedChange={() => onChange(toggleBuyBoxDealType(value, type.value))} />
          {type.label}
        </label>
      ))}
    </div>
  );
}

/** Read-only chips of the property types an investor buys. */
export function BuyBoxTypeChips({ types, className }: { types: string[]; className?: string }) {
  if (!types.length) return null;
  return (
    <span className={cn("flex flex-wrap gap-1.5", className)}>
      {BUYBOX_PROPERTY_TYPES.filter((t) => types.includes(t.value)).map((t) => (
        <span key={t.value} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
          {t.label}
        </span>
      ))}
    </span>
  );
}

/** Multi-select for the investor buy box: pick any combination of property types. */
export function BuyBoxTypePicker({ value, onChange, invalid }: { value: string[]; onChange: (v: string[]) => void; invalid?: boolean }) {
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  return (
    <div role="group" aria-label="Property types you buy" className="grid gap-2 sm:grid-cols-2">
      {BUYBOX_PROPERTY_TYPES.map((t) => {
        const on = value.includes(t.value);
        return (
          <button
            key={t.value}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(t.value)}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-card)] border bg-white p-3 text-left transition-colors",
              on ? "border-brand-600 ring-3 ring-brand-100" : invalid ? "border-red-300" : "border-border hover:border-brand-200",
            )}
          >
            <span className={cn("flex size-4 shrink-0 items-center justify-center rounded border", on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300")}>
              {on && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className="text-sm font-medium text-ink">{PROPERTY_TYPE_LABEL[t.value]}</span>
          </button>
        );
      })}
    </div>
  );
}
