import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/deals";

export const Route = createFileRoute("/_app/deals/")({
  head: () => ({
    meta: [
      { title: "My Deals — RealtyBridge" },
      { name: "description", content: "Manage the deals you've posted and the realtors interested in them." },
      { property: "og:title", content: "My Deals — RealtyBridge" },
      { property: "og:description", content: "Manage the deals you've posted and the realtors interested in them." },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: "canonical", href: "/deals" }],
  }),
  component: Page,
});

function Page() {
  return <Screen />;
}
