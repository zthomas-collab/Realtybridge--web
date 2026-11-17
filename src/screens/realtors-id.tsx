

import { MemberProfile } from "@/components/member-profile";

export default function RealtorProfilePage({ params }: { params: { id: string } }) {
  return <MemberProfile id={params.id} />;
}
