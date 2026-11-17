import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { countyKey, parseCounty } from "@/lib/domain/counties";
import { stateName } from "@/lib/domain/states";
import { Select } from "@/components/ui";

export function useCountyCatalog() {
  return useQuery({
    queryKey: ["us-counties"],
    queryFn: async () => (await (await fetch("/us-counties.json")).json()) as Record<string, string[]>,
    staleTime: Infinity,
  });
}

export function CountyPicker({ states, value, onChange }: { states: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const { data } = useCountyCatalog();
  if (!states.length) return <p className="text-sm text-muted">Pick your states first.</p>;
  return (
    <div className="space-y-3">
      {states.map((st) => {
        const chosen = value.filter((c) => parseCounty(c).state === st);
        const options = (data?.[st] ?? []).filter((c) => !value.includes(countyKey(st, c)));
        return (
          <div key={st}>
            <Select
              aria-label={`Add a county in ${stateName(st)}`}
              value=""
              onChange={(e) => e.target.value && onChange([...value, countyKey(st, e.target.value)])}
            >
              <option value="">{data ? `Add a county in ${stateName(st)}…` : "Loading counties…"}</option>
              {options.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            {chosen.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chosen.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                    {parseCounty(c).county}
                    <button type="button" aria-label={`Remove ${parseCounty(c).county}`} onClick={() => onChange(value.filter((v) => v !== c))}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
