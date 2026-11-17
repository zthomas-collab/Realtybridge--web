import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/login";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create your account — RealtyBridge" },
      { name: "description", content: "Join RealtyBridge as an investor, realtor or contractor. Private deals, verified local agents and two-way reviews." },
      { property: "og:url", content: "https://realtybridge.app/signup" },
      { property: "og:title", content: "Create your account — RealtyBridge" },
      { property: "og:description", content: "Join RealtyBridge as an investor, realtor or contractor. Private deals, verified local agents and two-way reviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://realtybridge.app/signup" }],
  }),
  component: Screen,
});
