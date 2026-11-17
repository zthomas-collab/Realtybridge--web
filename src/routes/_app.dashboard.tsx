import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/dashboard";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — RealtyBridge" },
      { name: "description", content: "Your deals, matches, ratings and next steps at a glance." },
      { property: "og:title", content: "Dashboard — RealtyBridge" },
      { property: "og:description", content: "Your deals, matches, ratings and next steps at a glance." },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: "canonical", href: "/dashboard" }],
  }),
  component: Page,
});

function Page() {
  return <Screen />;
}
