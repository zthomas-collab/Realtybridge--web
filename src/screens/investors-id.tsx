

import { MemberProfile } from "@/components/member-profile";

export default function InvestorProfilePage({ params }: { params: { id: string } }) {
  return <MemberProfile id={params.id} />;
}
