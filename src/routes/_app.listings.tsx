import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/listings";

export const Route = createFileRoute("/_app/listings")({
  head: () => ({
    meta: [
      { title: "Realtor Listings — RealtyBridge" },
      { name: "description", content: "On-market listings from realtors, shown to investors who buy in that area." },
      { property: "og:title", content: "Realtor Listings — RealtyBridge" },
      { property: "og:description", content: "On-market listings from realtors, shown to investors who buy in that area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/listings" }],
  }),
  component: Page,
});

function Page() {
  return <Screen />;
}
