import type { VerificationStatus } from "@/lib/types";

// Realtors enter a license number; RealtyBridge doesn't check it, so the badge says "on file", never "verified".
// Investors aren't licensed; their success rate is the trust signal.

export type BadgeTone = "yellow" | "green" | "red" | "gray";

export const VERIFICATION_BADGE: Record<VerificationStatus, { label: string; tone: BadgeTone }> = {
  not_submitted: { label: "License # Needed", tone: "gray" },
  verified: { label: "License # on File", tone: "green" },
};
