import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/settings";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — RealtyBridge" },
      { name: "description", content: "Billing, subscription and account settings." },
      { property: "og:title", content: "Settings — RealtyBridge" },
      { property: "og:description", content: "Billing, subscription and account settings." },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: "canonical", href: "/settings" }],
  }),
  component: Page,
});

function Page() {
  return <Screen />;
}
