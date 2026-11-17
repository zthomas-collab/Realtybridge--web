
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { US_STATES } from "@/lib/domain/states";
import { cn } from "@/lib/utils";

export function StateMultiSelect({ value, onChange, id, invalid }: { value: string[]; onChange: (v: string[]) => void; id?: string; invalid?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? US_STATES.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase() === q) : US_STATES;
  }, [query]);

  const toggle = (code: string) => onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code].sort());

  return (
    <div ref={root} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex min-h-10 w-full items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-left text-sm shadow-sm focus:border-brand-600 focus:ring-3 focus:ring-brand-100 focus:outline-none",
          invalid && "border-red-500",
        )}
      >
        <span className="flex flex-1 flex-wrap gap-1.5">
          {value.length === 0 && <span className="text-slate-400">Select the states you serve…</span>}
          {value.map((code) => (
            <span key={code} className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              {code}
              <span
                role="button"
                tabIndex={-1}
                aria-label={`Remove ${code}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(code);
                }}
                className="rounded hover:bg-brand-100"
              >
                <X className="size-3" />
              </span>
            </span>
          ))}
        </span>
        <ChevronDown className="size-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 text-slate-400" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search states" className="h-10 flex-1 bg-transparent text-sm outline-none" />
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-xs">
            <span className="text-muted">{value.length} selected</span>
            <span className="flex gap-3">
              <button type="button" className="font-medium text-brand-600 hover:underline" onClick={() => onChange(US_STATES.map((s) => s.code))}>
                Select all
              </button>
              <button type="button" className="font-medium text-slate-600 hover:underline" onClick={() => onChange([])}>
                Clear
              </button>
            </span>
          </div>
          <ul role="listbox" aria-multiselectable className="max-h-64 overflow-y-auto pb-1">
            {filtered.map((s) => {
              const selected = value.includes(s.code);
              return (
                <li key={s.code} role="option" aria-selected={selected}>
                  <button type="button" onClick={() => toggle(s.code)} className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                    <span className={cn("flex size-4 items-center justify-center rounded border", selected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300")}>
                      {selected && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="w-7 font-mono text-xs text-muted">{s.code}</span>
                    <span>{s.name}</span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted">No states match “{query}”</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
