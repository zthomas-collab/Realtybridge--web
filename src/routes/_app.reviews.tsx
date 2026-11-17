import { createFileRoute } from "@tanstack/react-router";
import { ldScript, personLd, toLdReviews } from "@/lib/seo/structured-data";
import Screen from "@/screens/reviews";

export const Route = createFileRoute("/_app/reviews")({
  loader: async () => {
    try {
      const { api } = await import("@/lib/api");
      const me = await api.me();
      const reviews = await api.reviewsAbout(me.id);
      const name = [me.first_name, me.last_name].filter(Boolean).join(" ");
      if (!name || reviews.length === 0) return { ld: null };
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      return { ld: personLd({ name, avgRating: avg, reviewCount: reviews.length, reviews: toLdReviews(reviews) }) };
    } catch {
      return { ld: null };
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: "Reviews — RealtyBridge" },
      { name: "description", content: "Reviews you've received, written and still owe." },
      { property: "og:title", content: "Reviews — RealtyBridge" },
      { property: "og:description", content: "Reviews you've received, written and still owe." },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: "canonical", href: "/reviews" }],
    scripts: loaderData?.ld ? [ldScript(loaderData.ld)] : [],
  }),
  component: Page,
});

function Page() {
  return <Screen />;
}
