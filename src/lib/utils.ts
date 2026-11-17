import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fullName(p: { first_name: string | null; last_name: string | null } | null | undefined): string {
  if (!p) return "";
  return [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean).join(" ") || "Member";
}

export function initials(p: { first_name: string | null; last_name: string | null }): string {
  return ((p.first_name?.[0] ?? "") + (p.last_name?.[0] ?? "")).toUpperCase() || "?";
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
/** Asking price; a deal posted without one shows "TBD". */
export const formatPrice = (n: number | null | undefined) => (n == null ? "TBD" : usd.format(n));
export const formatMoney = (n: number | null | undefined) => (n == null ? "—" : usd.format(n));

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}
