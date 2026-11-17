import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button, Card, CardBody, Field, Input } from "@/components/ui";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — RealtyBridge" },
      { name: "description", content: "Choose a new password for your RealtyBridge account." },
      { property: "og:title", content: "Reset your password — RealtyBridge" },
      { property: "og:description", content: "Choose a new password for your RealtyBridge account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => data.session && setReady(true));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError("Password must be at least 8 characters.");
    if (pw !== confirm) return setError("Passwords don't match.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) return setError(error.message);
    setDone(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full">
        <CardBody className="space-y-4">
          <h1 className="text-xl font-semibold">Reset your password</h1>
          {done ? (
            <>
              <p className="text-sm text-muted">Your password has been updated.</p>
              <a href="/dashboard" className="text-sm font-medium text-brand-600 hover:underline">Go to your dashboard</a>
            </>
          ) : !ready ? (
            <p className="text-sm text-muted">Open this page from the reset link in your email. If the link expired, request a new one from Settings or the sign-in page.</p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <Field label="New password" htmlFor="rp-new"><Input id="rp-new" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
              <Field label="Confirm new password" htmlFor="rp-confirm"><Input id="rp-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></Field>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" loading={saving} className="w-full">Save new password</Button>
            </form>
          )}
        </CardBody>
      </Card>
    </main>
  );
}
