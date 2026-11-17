import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/admin";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({
    meta: [
      { title: "Admin — RealtyBridge" },
      { name: "description", content: "RealtyBridge metrics, referral property addresses and contact emails, and member moderation." },
      { property: "og:title", content: "Admin — RealtyBridge" },
      { property: "og:description", content: "RealtyBridge metrics, referral property addresses and contact emails, and member moderation." },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: "canonical", href: "/admin" }],
  }),
  component: Page,
});

function Page() {
  return <Screen />;
}
