import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/login";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — RealtyBridge" },
      { name: "description", content: "Sign in or create your RealtyBridge account. Post a deal or find a realtor — connecting investors and realtors in all 50 states." },
      { property: "og:url", content: "https://realtybridge.app/login" },
      { property: "og:title", content: "Sign in — RealtyBridge" },
      { property: "og:description", content: "Sign in or create your RealtyBridge account. Post a deal or find a realtor — connecting investors and realtors in all 50 states." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://realtybridge.app/login" }],
  }),
  component: Screen,
});
