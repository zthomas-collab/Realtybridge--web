import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/deals-new";

export const Route = createFileRoute("/_app/deals/new")({
  head: () => ({
    meta: [
      { title: "Post a Deal — RealtyBridge" },
      { name: "description", content: "Post a novation or buyer's agent deal to licensed realtors in your market." },
      { property: "og:title", content: "Post a Deal — RealtyBridge" },
      { property: "og:description", content: "Post a novation or buyer's agent deal to licensed realtors in your market." },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: "canonical", href: "/deals/new" }],
  }),
  component: Page,
});

function Page() {
  return <Screen />;
}
