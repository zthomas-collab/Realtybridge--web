import { createFileRoute } from "@tanstack/react-router";
import { dealLd, ldScript } from "@/lib/seo/structured-data";
import Screen from "@/screens/deals-id";

export const Route = createFileRoute("/_app/deals/$id")({
  loader: async ({ params }) => {
    try {
      const { api } = await import("@/lib/api");
      const d = (await api.getDeal(params.id)).deal;
      const ld = dealLd({ title: d.title, description: d.description, city: d.city, state: d.state, zip: d.zip, price: d.asking_price, propertyType: d.property_type });
      return { name: `${d.title} — ${d.city}, ${d.state}`, ld };
    } catch {
      return { name: null as string | null, ld: null };
    }
  },
  head: ({ params, loaderData }) => ({
    meta: [
      { title: loaderData?.name ? `${loaderData.name} — RealtyBridge` : "Deal — RealtyBridge" },
      { name: "description", content: "Deal details, interested realtors and match status." },
      { property: "og:title", content: loaderData?.name ? `${loaderData.name} — RealtyBridge` : "Deal — RealtyBridge" },
      { property: "og:description", content: "Deal details, interested realtors and match status." },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: "canonical", href: `/deals/${params.id}` }],
    scripts: loaderData?.ld ? [ldScript(loaderData.ld)] : [],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <Screen params={{ id }} />;
}
