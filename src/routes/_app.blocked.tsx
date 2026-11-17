import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/blocked";

export const Route = createFileRoute("/_app/blocked")({
  head: () => ({
    meta: [
      { title: "Blocked Realtors — RealtyBridge" },
      { name: "description", content: "Manage realtors you've blocked from your deals." },
      { property: "og:title", content: "Blocked Realtors — RealtyBridge" },
      { property: "og:description", content: "Manage realtors you've blocked from your deals." },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: "canonical", href: "/blocked" }],
  }),
  component: Page,
});

function Page() {
  return <Screen />;
}
