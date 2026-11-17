import { createFileRoute } from "@tanstack/react-router";
import { ldScript, personLd, toLdReviews } from "@/lib/seo/structured-data";
import Screen from "@/screens/realtors-id";

export const Route = createFileRoute("/_app/realtors/$id")({
  loader: async ({ params }) => {
    try {
      const { api } = await import("@/lib/api");
      const [{ profile: p }, reviews] = await Promise.all([api.memberProfile(params.id), api.reviewsAbout(params.id)]);
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
      const ld = name ? personLd({ name, avgRating: p.avg_rating, reviewCount: p.review_count, reviews: toLdReviews(reviews) }) : null;
      return { name: name || null, ld };
    } catch {
      return { name: null as string | null, ld: null };
    }
  },
  head: ({ params, loaderData }) => ({
    meta: [
      { title: loaderData?.name ? `${loaderData.name} — RealtyBridge` : "Realtor Profile — RealtyBridge" },
      { name: "description", content: "Realtor license, services, track record and reviews." },
      { property: "og:title", content: loaderData?.name ? `${loaderData.name} — RealtyBridge` : "Realtor Profile — RealtyBridge" },
      { property: "og:description", content: "Realtor license, services, track record and reviews." },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: "canonical", href: `/realtors/${params.id}` }],
    scripts: loaderData?.ld ? [ldScript(loaderData.ld)] : [],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <Screen params={{ id }} />;
}
