import { describe, expect, it } from "vitest";
import { REVIEW_CATEGORIES, type Review } from "@/lib/types";
import { emptyReviewScores, summarizeReviews, validateCompleteReviewScores } from "@/lib/domain/ratings";

function review(scores: Partial<Review>): Review {
  return { id: "r", match_id: "m", reviewer_id: "a", reviewee_id: "b", state: "NC", rating: 5,
    communication: 5, contract_accuracy: 5, speed_to_close: 5, market_knowledge: 5,
    body: null, hidden: false, is_flagged: false, flag_reason: null, created_at: "2026-11-17", ...scores };
}

describe("member scorecard rules", () => {
  it.each(["knowledge", "professionalism", "follow_through", "problem_solving", "team_player"] as const)("averages %s with each visible review, excluding hidden and legacy null scores", (key) => {
    const summary = summarizeReviews([review({ [key]: 5 }), review({ [key]: 2, rating: 3 }), review({ [key]: null }), review({ [key]: 1, hidden: true })]);
    expect(summary.categories[key]).toBe(3.5);
    expect(summary.average).toBe(4.33);
    expect(summary.count).toBe(3);
  });
  it("does not invent category ratings before the first scored review", () => {
    expect(summarizeReviews([review({})]).categories.professionalism).toBeNull();
  });
  it.each(REVIEW_CATEGORIES)("requires $key on new reviews", ({ key }) => {
    const scores = Object.fromEntries(REVIEW_CATEGORIES.map(c => [c.key, 4]));
    expect(validateCompleteReviewScores({ rating: 5, ...scores, [key]: null })).not.toBeNull();
    expect(validateCompleteReviewScores({ rating: 5, ...scores })).toBeNull();
  });
  it.each([0, 6, 2.5])("rejects invalid category score %s", score => {
    expect(validateCompleteReviewScores({ rating: 5, ...emptyReviewScores(), professionalism: score })).not.toBeNull();
  });
});