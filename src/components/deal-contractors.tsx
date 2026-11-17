import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, Hammer, Mail, Phone, Search } from "lucide-react";
import { api } from "@/lib/api";
import { contractorServiceLabel } from "@/lib/domain/contractors";
import { formatUsPhone } from "@/lib/domain/phone";
import { fullName } from "@/lib/utils";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Input, Select } from "@/components/ui";

const ALL_SERVICES = "__all__";

/** Investor-friendly contractors covering this deal's area (shown to the deal's investor and matched realtor). */
export function DealContractors({ dealId }: { dealId: string }) {
  const { data } = useQuery({ queryKey: ["deal-contractors", dealId], queryFn: () => api.contractorsForDeal(dealId) });
  const [service, setService] = useState(ALL_SERVICES);
  const [query, setQuery] = useState("");

  // Service choices come from the contractors actually listed, so the dropdown only offers what's on this deal.
  const serviceOptions = useMemo(() => {
    if (!data) return [];
    const labels = new Set<string>();
    for (const c of data) for (const s of c.contractor_services) labels.add(contractorServiceLabel(s));
    return [...labels].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.filter((c) => {
      if (service !== ALL_SERVICES && !c.contractor_services.some((s) => contractorServiceLabel(s) === service)) return false;
      if (!q) return true;
      const haystack = [c.company_name, fullName(c), c.bio].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [data, service, query]);

  if (!data) return null;
  const filtersActive = service !== ALL_SERVICES || query.trim() !== "";

  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Hammer className="size-4 text-slate-400" /> The Black Book</span>} description={data.length ? `Investor-friendly contractors covering this property: ${data.length} contractor${data.length === 1 ? "" : "s"}` : undefined} />
      {data.length === 0 ? (
        <EmptyState icon={<Hammer />} title="No contractors in this area yet" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contractors"
                className="pl-9"
                aria-label="Search contractors"
              />
            </div>
            <Select value={service} onChange={(e) => setService(e.target.value)} aria-label="Filter by service" className="w-auto min-w-[180px]">
              <option value={ALL_SERVICES}>All services</option>
              {serviceOptions.map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </Select>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={() => { setService(ALL_SERVICES); setQuery(""); }}>
                Clear
              </Button>
            )}
          </div>
          {filtered.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted">No contractors match your filters.</div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((c) => {
                const site = c.website ? (c.website.startsWith("http") ? c.website : `https://${c.website}`) : null;
                return (
                  <li key={c.id} className="flex gap-3 px-5 py-4">
                    <Avatar person={c} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c.company_name || fullName(c)}</p>
                      {c.company_name && <p className="text-sm text-muted">{fullName(c)}</p>}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.contractor_services.map((s) => (
                          <Badge key={s} tone="gray">{contractorServiceLabel(s)}</Badge>
                        ))}
                      </div>
                      {c.bio && <p className="mt-2 text-sm whitespace-pre-line text-muted">{c.bio}</p>}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-brand-600 hover:underline"><Phone className="size-4" /> {formatUsPhone(c.phone)}</a>}
                        <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-brand-600 hover:underline"><Mail className="size-4" /> {c.email}</a>
                        {site && <a href={site} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand-600 hover:underline"><Globe className="size-4" /> Website</a>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}
