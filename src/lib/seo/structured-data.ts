// JSON-LD builders for route head() scripts. Inputs are plain loader data.
export type LdReview = { author: string; rating: number; body: string | null; date: string };
export type LdPerson = { name: string; avgRating: number | null; reviewCount: number; reviews: LdReview[] };
export type LdDeal = { title: string; description: string | null; city: string; state: string; zip: string | null; price: number | null; propertyType: string };

const reviewLd = (r: LdReview) => ({
  "@type": "Review",
  author: { "@type": "Person", name: r.author },
  reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
  ...(r.body && { reviewBody: r.body }),
  datePublished: r.date.slice(0, 10),
});

export function personLd(p: LdPerson) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.name,
    ...(p.avgRating != null && p.reviewCount > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: Number(p.avgRating.toFixed(2)), reviewCount: p.reviewCount, bestRating: 5, worstRating: 1 },
    }),
    ...(p.reviews.length > 0 && { review: p.reviews.map(reviewLd) }),
  };
}

export function dealLd(d: LdDeal) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: d.title,
    category: d.propertyType.replace(/_/g, " "),
    ...(d.description && { description: d.description }),
    ...(d.price != null && {
      offers: {
        "@type": "Offer",
        price: d.price,
        priceCurrency: "USD",
        availableAtOrFrom: {
          "@type": "Place",
          address: { "@type": "PostalAddress", addressLocality: d.city, addressRegion: d.state, ...(d.zip && { postalCode: d.zip }), addressCountry: "US" },
        },
      },
    }),
  };
}

export const ldScript = (data: unknown) => ({ type: "application/ld+json", children: JSON.stringify(data) });

type ReviewRow = { rating: number; body: string | null; created_at: string; hidden?: boolean; reviewer: { first_name: string | null; last_name: string | null } };
export const toLdReviews = (rows: ReviewRow[]): LdReview[] =>
  rows
    .filter((r) => !r.hidden)
    .slice(0, 5)
    .map((r) => ({ author: [r.reviewer.first_name, r.reviewer.last_name].filter(Boolean).join(" ") || "RealtyBridge member", rating: r.rating, body: r.body, date: r.created_at }));
