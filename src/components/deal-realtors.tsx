import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { api } from "@/lib/api";
import { fullName } from "@/lib/utils";
import { Avatar, Button, Card, CardHeader, EmptyState, Spinner } from "@/components/ui";
import { RatingInline } from "@/components/stars";
import { ServiceChips } from "@/components/services";
import Link from "@/lib/next/link";

export function DealRealtors({ dealId, area }: { dealId: string; area: string }) {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["deal-realtors", dealId],
    queryFn: () => api.realtorsForDeal(dealId),
  });

  return (
    <Card>
      <CardHeader title="Realtors serving this property" description={area} />
      {isPending ? <div className="px-5 py-4"><Spinner /></div> : error ? (
        <EmptyState icon={<Users />} title="Realtor list unavailable" action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>} />
      ) : !data?.length ? (
        <EmptyState icon={<Users />} title="No realtors serving this area yet" />
      ) : (
        <ul className="divide-y divide-border">
          {data.map((realtor) => (
            <li key={realtor.id} className="flex items-start gap-3 px-5 py-4">
              <Avatar person={realtor} size={40} />
              <div className="min-w-0 flex-1">
                <Link href={`/realtors/${realtor.id}`} className="font-medium text-ink hover:text-brand-600 hover:underline">{fullName(realtor)}</Link>
                {realtor.brokerage_name && <p className="break-words text-sm text-muted">{realtor.brokerage_name}</p>}
                <div className="mt-1"><RatingInline avg={realtor.avg_rating} count={realtor.review_count} size={12} /></div>
                <ServiceChips services={realtor.services} className="mt-2" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}