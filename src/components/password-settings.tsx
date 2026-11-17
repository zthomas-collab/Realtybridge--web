import { useState } from "react";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button, Card, CardBody, CardHeader, Field, Input } from "@/components/ui";
import { toast } from "@/components/toast";

export function PasswordSettings({ email }: { email?: string | null }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (next !== confirm) return setError("New passwords don't match.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: next, current_password: current } as never);
    setSaving(false);
    if (error) return setError(error.message);
    setCurrent(""); setNext(""); setConfirm("");
    toast.success("Password updated");
  }

  async function sendReset() {
    const { data } = await supabase.auth.getUser();
    const to = data.user?.email ?? email;
    if (!to) return toast.error("No email on this account");
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(to, { redirectTo: `${window.location.origin}/reset-password` });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Reset link sent to ${to}`);
  }

  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><KeyRound className="size-4 text-slate-400" /> Password</span>} description="Change your password, or get a reset link by email if you've forgotten it or signed up with Google." />
      <CardBody>
        <form onSubmit={change} className="grid gap-3 sm:grid-cols-3">
          <Field label="Current password" htmlFor="pw-current"><Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></Field>
          <Field label="New password" htmlFor="pw-new"><Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required /></Field>
          <Field label="Confirm new password" htmlFor="pw-confirm"><Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></Field>
          {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <Button type="submit" loading={saving}>Update password</Button>
            <Button type="button" variant="secondary" loading={sending} onClick={sendReset}>Email me a reset link</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
