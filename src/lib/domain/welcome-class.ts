/** Welcome email with the Novations Class invite: sent once to new members until the class (Nov 2, 2026, 6pm ET). */
export const NOVATION_CLASS_LINK = "https://meet.google.com/xco-cqsy-tst";
export const NOVATION_CLASS_START = new Date("2026-11-02T18:00:00-05:00"); // 6pm Eastern (EST)
export const WELCOME_NEW_MEMBER_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export function shouldSendWelcomeClass(now: Date, joinedAt: Date): boolean {
  if (now.getTime() >= NOVATION_CLASS_START.getTime()) return false;
  return now.getTime() - joinedAt.getTime() <= WELCOME_NEW_MEMBER_WINDOW_MS;
}
