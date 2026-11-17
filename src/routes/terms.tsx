import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/terms";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms, Conduct & Privacy — RealtyBridge" },
      { name: "description", content: "RealtyBridge Terms of Service, Professional Conduct Agreement and Privacy Policy." },
      { property: "og:url", content: "https://realtybridge.app/terms" },
      { property: "og:title", content: "Terms, Conduct & Privacy — RealtyBridge" },
      { property: "og:description", content: "RealtyBridge Terms of Service, Professional Conduct Agreement and Privacy Policy." },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: "canonical", href: "https://realtybridge.app/terms" }],
  }),
  component: Page,
});

function Page() {
  return <Screen />;
}
