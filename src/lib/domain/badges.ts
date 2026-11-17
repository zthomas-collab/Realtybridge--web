import type { UserRole } from "@/lib/types";

/** Official launch day; Founding Member = joined before launch + 60 days. Confirm with owner. */
export const LAUNCH_DATE = "2026-10-15";
const DAY = 86_400_000;

export interface BadgeInput {
  role: UserRole;
  created_at: string;
  completed_deals: number;
  avg_rating: number | null;
  review_count: number;
  now?: Date;
}

export interface MemberBadge {
  key: string;
  label: string;
  criteria: string;
}

const ROLE_WORD: Partial<Record<UserRole, string>> = { investor: "Investor", realtor: "Realtor", contractor: "Contractor" };

/** Earned badges, most prestigious first. Only uses confirmed deals and member reviews. */
export function memberBadges(m: BadgeInput): MemberBadge[] {
  const now = (m.now ?? new Date()).getTime();
  const joined = new Date(m.created_at).getTime();
  const sinceLaunch = (joined - new Date(LAUNCH_DATE).getTime()) / DAY;
  const out: MemberBadge[] = [];
  const rated = m.review_count >= 5 && (m.avg_rating ?? 0) >= 4.8;

  if (m.role === "realtor") {
    if (m.completed_deals >= 5) out.push({ key: "high_performer", label: "High Performer", criteria: "5+ deals both sides confirmed sold on RealtyBridge" });
    if (rated) out.push({ key: "five_star", label: "5-Star Professional", criteria: "4.8+ average from 5+ reviews by matched investors" });
  }
  if (m.role === "investor") {
    if (m.completed_deals >= 5) out.push({ key: "deal_maker", label: "Deal Maker", criteria: "5+ deals both sides confirmed sold on RealtyBridge" });
    if (rated) out.push({ key: "trusted_investor", label: "Trusted Investor", criteria: "4.8+ average from 5+ reviews by matched realtors" });
  }
  if (sinceLaunch < 60) {
    const word = ROLE_WORD[m.role];
    out.push({ key: "founding", label: word ? `Founding ${word}` : "Founding Member", criteria: "Joined within the first 60 days of launch" });
  } else if (sinceLaunch < 180) {
    out.push({ key: "early_supporter", label: "Early Supporter", criteria: "Joined in months 3–6 after launch" });
  }
  if (now - joined >= 365 * DAY) out.push({ key: "veteran", label: "RealtyBridge Veteran", criteria: "Member for 12+ months" });
  return out;
}
