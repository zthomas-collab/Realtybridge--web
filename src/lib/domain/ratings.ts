import { REVIEW_CATEGORIES, type Review, type ReviewCategory } from "@/lib/types";

export interface RatingSummary {
  count: number;
  average: number | null;
  categories: Record<ReviewCategory, number | null>;
  /** count of reviews at each star value, index 0 = 1 star */
  distribution: [number, number, number, number, number];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return round2(values.reduce((a, b) => a + b, 0) / values.length);
}

/** Mirrors the public.rating_summaries view: hidden reviews are excluded, category averages skip nulls. */
export function summarizeReviews(reviews: Review[]): RatingSummary {
  const visible = reviews.filter((r) => !r.hidden);
  const distribution: RatingSummary["distribution"] = [0, 0, 0, 0, 0];
  for (const r of visible) distribution[r.rating - 1]++;

  const categories = Object.fromEntries(
    REVIEW_CATEGORIES.map(({ key }) => [
      key,
      mean(visible.map((r) => r[key]).filter((v): v is number => v != null)),
    ]),
  ) as Record<ReviewCategory, number | null>;

  return {
    count: visible.length,
    average: mean(visible.map((r) => r.rating)),
    categories,
    distribution,
  };
}

/** Per-state summaries — investors rate realtors per state. */
export function summarizeByState(reviews: Review[]): Record<string, RatingSummary> {
  const byState: Record<string, Review[]> = {};
  for (const r of reviews) (byState[r.state] ??= []).push(r);
  return Object.fromEntries(Object.entries(byState).map(([s, rs]) => [s, summarizeReviews(rs)]));
}

export function validateReviewScores(input: { rating: number } & Partial<Record<ReviewCategory, number | null>>): string | null {
  const ok = (n: number) => Number.isInteger(n) && n >= 1 && n <= 5;
  if (!ok(input.rating)) return "Overall rating must be 1–5 stars";
  for (const { key, label } of REVIEW_CATEGORIES) {
    const v = input[key];
    if (v != null && !ok(v)) return `${label} must be 1–5 stars`;
  }
  return null;
}

/** New reviews require all categories; legacy reviews keep their original scores. */
export function validateCompleteReviewScores(input: { rating: number } & Partial<Record<ReviewCategory, number | null>>): string | null {
  const error = validateReviewScores(input);
  if (error) return error;
  for (const { key, label } of REVIEW_CATEGORIES) {
    if (input[key] == null) return `Choose a score for ${label}`;
  }
  return null;
}

export function emptyReviewScores(): Record<ReviewCategory, number> {
  return Object.fromEntries(REVIEW_CATEGORIES.map(({ key }) => [key, 0])) as Record<ReviewCategory, number>;
}
