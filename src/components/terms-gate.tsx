
import { ScrollText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { keys, useAction, useMe } from "@/lib/hooks";
import { hasAcceptedTerms } from "@/lib/domain/paywall";
import { ConductAgreement } from "@/lib/legal/conduct-agreement";
import { TERMS_CHECKBOX_TEXT } from "@/lib/legal/terms";
import { Button, Card, Checkbox, PageLoader } from "@/components/ui";

/**
 * Signup step: every investor and realtor must accept the Professional Conduct Agreement & Terms of Service
 * (un-prechecked box) before using the platform. Also re-prompts when TERMS_VERSION changes.
 */
export function TermsGate({ children }: { children: React.ReactNode }) {
  const { data: me } = useMe();
  if (!me) return <PageLoader />;
  if (me.role === "admin" || hasAcceptedTerms(me)) return <>{children}</>;
  return <AcceptTerms isUpdate={!!me.terms_accepted_at} />;
}

function AcceptTerms({ isUpdate }: { isUpdate: boolean }) {
  const [agreed, setAgreed] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  // if the whole agreement fits on screen there's nothing to scroll
  useEffect(() => {
    const el = scroller.current;
    if (el && el.scrollHeight <= el.clientHeight + 24) setScrolledToEnd(true);
  }, []);
  const accept = useAction(() => api.acceptTerms(), { success: "Thanks, welcome to RealtyBridge", invalidate: [keys.me] });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <ScrollText className="size-6" />
        </div>
        <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">{isUpdate ? "Updated terms" : "Final step to join"}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Professional Conduct Agreement, Terms of Service &amp; Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted">
          {isUpdate
            ? "We've updated our agreement, including our Privacy Policy. Please review and accept it to keep using RealtyBridge."
            : "Every investor, wholesaler, agent and broker on RealtyBridge agrees to the same standards. Please read and accept to continue."}
        </p>
      </div>

      <Card className="overflow-hidden">
        <div
          ref={scroller}
          tabIndex={0}
          aria-label="Agreement text"
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolledToEnd(true);
          }}
          className="max-h-[55vh] overflow-y-auto p-6"
        >
          <ConductAgreement />
        </div>
        <div className="space-y-4 border-t border-border bg-slate-50/70 p-5">
          {!scrolledToEnd && <p className="text-xs text-muted">Scroll to the end of the agreement to continue.</p>}
          <Checkbox id="accept-terms" checked={agreed} onChange={setAgreed}>
            <span className="font-medium text-ink">{TERMS_CHECKBOX_TEXT}</span>
          </Checkbox>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <a href="/terms" target="_blank" className="text-sm text-brand-600 hover:underline">
              Open in a new tab
            </a>
            <Button size="lg" disabled={!agreed || !scrolledToEnd} loading={accept.isPending} onClick={() => accept.mutate(undefined)}>
              Agree and continue
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
