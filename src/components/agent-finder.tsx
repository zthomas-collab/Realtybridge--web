import { useQuery } from "@tanstack/react-query";
import { Handshake } from "lucide-react";
import { api } from "@/lib/api";
import { fullName } from "@/lib/utils";
import { Avatar, Spinner } from "@/components/ui";
import Link from "@/lib/next/link";

/**
 * "Where's my agent?" — blank until the investor accepts a realtor on a deal; then shows that
 * active connection to both parties (investor sees the agent, realtor sees the investor).
 */
export function AgentFinder({ viewer = "investor" }: { viewer?: "investor" | "realtor" }) {
  const { data, isLoading } = useQuery({ queryKey: ["active-connections"], queryFn: () => api.activeConnections() });

  return (
    <div className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{viewer === "investor" ? "Where's my agent?" : "My investor connections"}</p>
        <span className="flex size-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <Handshake className="size-[18px]" />
        </span>
      </div>
      <div className="mt-3 min-h-16 flex-1">
        {isLoading ? (
          <Spinner />
        ) : !data?.length ? (
          <p className="text-sm text-muted">
            {viewer === "investor" ? "Your agent shows here once you accept a realtor on a deal." : "Shows here once an investor picks you as the agent on a deal."}
          </p>
        ) : (
          <ul className="space-y-2">
            {data.slice(0, 4).map(({ match, deal, counterparty }) => (
              <li key={match.id}>
                <Link href={`/deals/${deal.id}`} className="flex items-center gap-2 rounded-md hover:bg-slate-50">
                  <Avatar person={counterparty} size={24} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{fullName(counterparty)}</span>
                    <span className="block truncate text-[11px] text-muted">{deal.title} · {deal.city}, {deal.state}</span>
                  </span>
                  <span className="text-[11px] font-medium text-emerald-700">Active</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
