import { IdCard, KeyRound, Signpost } from "lucide-react";
import type { AgentNeed, DealStatus, VerificationStatus } from "@/lib/types";
import { AGENT_NEED_COPY } from "@/lib/domain/agent-need";
import { VERIFICATION_BADGE } from "@/lib/domain/trust";
import { Badge } from "@/components/ui";

const VERIFICATION_ICON = {
  not_submitted: null,
  verified: <IdCard />,
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const b = VERIFICATION_BADGE[status];
  return (
    <Badge tone={b.tone}>
      {VERIFICATION_ICON[status]}
      {b.label}
    </Badge>
  );
}

const DEAL_STATUS: Record<DealStatus, { label: string; tone: "gray" | "blue" | "green" | "yellow" | "red" | "purple" }> = {
  live: { label: "Live", tone: "green" },
  matched: { label: "Matched", tone: "blue" },
  sold: { label: "Sold", tone: "purple" },
  withdrawn: { label: "Withdrawn", tone: "gray" },
  rejected: { label: "Not Approved", tone: "red" },
};

/** Listing agent = navy, buyer's agent = teal, echoing the two sides of the logo. */
export function AgentNeedBadge({ need }: { need: AgentNeed }) {
  return need === "listing_agent" ? (
    <Badge className="border-slate-300 bg-slate-100 text-navy">
      <Signpost />
      {AGENT_NEED_COPY.listing_agent.label}
    </Badge>
  ) : (
    <Badge tone="blue">
      <KeyRound />
      {AGENT_NEED_COPY.buyers_agent.label}
    </Badge>
  );
}

export function DealStatusBadge({ status }: { status: DealStatus }) {
  const s = DEAL_STATUS[status];
  return (
    <Badge tone={s.tone}>
      {status === "live" && <span className="size-1.5 rounded-full bg-emerald-500" />}
      {s.label}
    </Badge>
  );
}
