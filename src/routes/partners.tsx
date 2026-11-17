import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/partners";
import { PARTNERS } from "@/lib/domain/partners";

const TITLE = "Partners — RealtyBridge";
const DESCRIPTION =
  "The organizations RealtyBridge works with — foreclosure prevention, investor lending, wholesaling coaching and title & escrow. Each partner's logo links straight to their own website.";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:url", content: "https://realtybridge.app/partners" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://realtybridge.app/partners" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "RealtyBridge Partners",
          url: "https://realtybridge.app/partners",
          itemListElement: PARTNERS.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: p.name,
            url: p.url,
          })),
        }),
      },
    ],
  }),
  component: Screen,
});
