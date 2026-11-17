import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useCallback, useState } from "react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createInvestorCheckout, upgradeSubscription } from "@/lib/payments.functions";
import { useQueryClient } from "@tanstack/react-query";
import { keys } from "@/lib/hooks";
import { Button, Dialog, type ButtonProps } from "@/components/ui";
import { toast } from "@/components/toast";
import { errorMessage } from "@/lib/utils";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return <div className="w-full border-b border-red-300 bg-red-100 px-4 py-2 text-center text-sm text-red-800">Payments aren&apos;t live yet. Complete go-live in the Payments tab to accept real payments.</div>;
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-orange-300 bg-orange-100 px-4 py-2 text-center text-sm text-orange-800">
        Payments in the preview are in test mode — use card 4242 4242 4242 4242.
      </div>
    );
  }
  return null;
}

/** Opens the investor subscription checkout in a dialog. */
/** Switches an existing subscription onto the plan the account's profiles require. */
export function UpgradeButton({ children, ...props }: ButtonProps) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const r = await upgradeSubscription({ data: { environment: getStripeEnvironment() } });
      if ("error" in r) throw new Error(r.error);
      toast.success("Plan upgraded.");
      [1500, 5000].forEach((ms) => setTimeout(() => qc.invalidateQueries({ queryKey: keys.me }), ms));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return <Button {...props} loading={busy} onClick={run}>{children}</Button>;
}

export function SubscribeButton({ children, interval, ...props }: ButtonProps & { interval?: "month" | "year" }) {
  const [open, setOpen] = useState(false);
  const fetchClientSecret = useCallback(async () => {
    try {
      const result = await createInvestorCheckout({
        data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/settings?billing=success`, interval },
      });
      if ("error" in result) throw new Error(result.error);
      return result.clientSecret;
    } catch (e) {
      toast.error(errorMessage(e));
      setOpen(false);
      throw e;
    }
  }, [interval]);
  return (
    <>
      <Button {...props} onClick={() => setOpen(true)}>{children}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Subscribe to RealtyBridge">
        {open && (
          <div className="max-h-[75vh] overflow-y-auto p-2">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </Dialog>
    </>
  );
}
