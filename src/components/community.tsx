import { Handshake, Info, MapPin } from "lucide-react";
import { useState } from "react";
import type { Profile } from "@/lib/types";
import { Alert, ButtonLink, Card } from "@/components/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const PROFILE_LOCATION_HREF = "/profile#markets";
export const hasLocation = (me: Profile) => (me.markets?.length ?? 0) > 0;

/** Role-directed call to action that replaced the member counts. */
export function ConnectionsPrompt({ me }: { me: Profile }) {
  const c =
    me.role === "investor"
      ? { title: "Post a deal to see your connections", body: "Verified realtors and contractors in that property's area are matched to every deal you post.", href: "/deals/new", cta: "Post a Deal" }
      : me.role === "realtor"
        ? { title: "Post a listing to see your connections", body: "Investors in your market see your on-market listings and can reach you directly.", href: "/listings", cta: "Post a Listing" }
        : { title: "Complete your service area to see your connections", body: "Investors posting deals in your area see you at the bottom of their deals.", href: PROFILE_LOCATION_HREF, cta: "Set My Service Area" };
  return (
    <Card className="flex flex-col gap-4 border-brand-200 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-primary-foreground"><Handshake className="size-5" /></span>
        <div>
          <h2 className="text-base font-semibold text-ink">{c.title}</h2>
          <p className="mt-0.5 text-sm text-muted">{c.body}</p>
        </div>
      </div>
      <ButtonLink href={c.href}>{c.cta}</ButtonLink>
    </Card>
  );
}

/** ⓘ hint — opens on hover (desktop) and tap (mobile). */
export function LocationInfo() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Why am I not seeing deals?" className="inline-flex size-6 items-center justify-center rounded-full text-muted hover:text-brand-600" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
          <Info className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm" side="top">
        Not seeing deals? Set your location in your profile to discover investment opportunities and connect with Investors, Realtors, and Contractors in your area.
      </PopoverContent>
    </Popover>
  );
}

/** Shown until the member saves at least one state. */
export function LocationReminder({ me }: { me: Profile }) {
  if (hasLocation(me)) return null;
  return (
    <Alert tone="blue" icon={<MapPin />} title="Find Opportunities Near You!" action={<ButtonLink href={PROFILE_LOCATION_HREF} size="sm">Set My Location</ButtonLink>}>
      Your RealtyBridge experience starts with your location. Update your profile to discover local deals and connect with members in your market.
    </Alert>
  );
}
