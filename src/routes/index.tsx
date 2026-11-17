import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/home";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RealtyBridge — Private Investor Deals for Verified Local Realtors" },
      { name: "description", content: "Investors post deals free. Only verified realtors in that area can see them. Two-way reviews after every closing help investors, agents, and contractors connect with confidence." },
      { property: "og:url", content: "https://realtybridge.app/" },
      { property: "og:title", content: "RealtyBridge — Private Investor Deals for Verified Local Realtors" },
      { property: "og:description", content: "Investors post deals free. Only verified realtors in that area can see them. Two-way reviews after every closing help investors, agents, and contractors connect with confidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://realtybridge.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", name: "RealtyBridge", url: "https://realtybridge.app", logo: "https://realtybridge.app/brand/realtybridge-logo.png" },
            { "@type": "WebSite", name: "RealtyBridge", url: "https://realtybridge.app" },
          ],
        }),
      },
    ],
  }),
  component: Screen,
});
