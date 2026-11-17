import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/browse";

export const Route = createFileRoute("/_app/browse")({
  head: () => ({
    meta: [
      { title: "Properties in My Area — RealtyBridge" },
      { name: "description", content: "Live investor deals in your license state and markets." },
      { property: "og:title", content: "Properties in My Area — RealtyBridge" },
      { property: "og:description", content: "Live investor deals in your license state and markets." },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: "canonical", href: "/browse" }],
  }),
  component: Page,
});

function Page() {
  return <Screen />;
}
