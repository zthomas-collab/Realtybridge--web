import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/profile";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Profile — RealtyBridge" },
      { name: "description", content: "Your photo, contact details, markets and license." },
      { property: "og:title", content: "Profile — RealtyBridge" },
      { property: "og:description", content: "Your photo, contact details, markets and license." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/profile" }],
  }),
  component: Page,
});

function Page() {
  return <Screen />;
}
