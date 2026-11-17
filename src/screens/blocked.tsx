
import { useQuery } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import Link from "@/lib/next/link";
import { api } from "@/lib/api";
import { keys, useAction } from "@/lib/hooks";
import { fullName, timeAgo } from "@/lib/utils";
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, PageLoader } from "@/components/ui";

export default function BlockedPage() {
  const { data } = useQuery({ queryKey: keys.blocked, queryFn: api.listBlocked });
  const unblock = useAction((id: string) => api.unblock(id), { success: "Realtor unblocked" });

  if (!data) return <PageLoader />;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Blocked Realtors" description="Blocked realtors can't see the deal they were blocked on, or any of your deals if blocked from all postings." />
      <Card>
        {data.length === 0 ? (
          <EmptyState icon={<Ban />} title="You haven't blocked anyone" description="You can block a realtor from the Interested Realtors list on any of your deals." />
        ) : (
          <ul className="divide-y divide-border">
            {data.map((b) => (
              <li key={b.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <Avatar person={b.blocked} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{fullName(b.blocked)}</p>
                  <p className="text-xs text-muted">{b.blocked.brokerage_name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {b.deal ? (
                      <Badge tone="gray">
                        Blocked on{" "}
                        <Link href={`/deals/${b.deal.id}`} className="underline">
                          {b.deal.title}
                        </Link>
                      </Badge>
                    ) : (
                      <Badge tone="red">Blocked from all deals</Badge>
                    )}
                    <span className="text-xs text-muted">{timeAgo(b.created_at)}</span>
                  </div>
                  {b.reason && <p className="mt-1.5 text-sm text-slate-600">“{b.reason}”</p>}
                </div>
                <Button variant="secondary" size="sm" onClick={() => unblock.mutate(b.id)} loading={unblock.isPending && unblock.variables === b.id}>
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
