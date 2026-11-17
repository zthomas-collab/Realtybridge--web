import { Building2, Hammer, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { usePathname, useRouter, useSearchParams } from "@/lib/next/navigation";
import { cn } from "@/lib/utils";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

import { monthlyPriceForRoles, primaryRole, type MemberRole } from "@/lib/domain/contractors";
import { TRIAL_DAYS } from "@/lib/domain/paywall";
const ROLE_KEY = "rb_pending_role";

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

/** Google sign-ups carry no role, so the role picked here is claimed once the session exists (no-op for existing accounts). */
async function finishSignIn() {
  const raw = sessionStorage.getItem(ROLE_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  const roles = (raw ?? "").split(",").filter((r): r is MemberRole => r === "investor" || r === "realtor" || r === "contractor");
  if (roles.length) await supabase.rpc("claim_roles", { p_roles: roles });
}

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const next = safeNext(params.get("next"));
  const qRole = params.get("role");
  const [mode, setMode] = useState<"signin" | "signup">(pathname === "/signup" || params.get("mode") === "signup" || qRole ? "signup" : "signin");
  const [roles, setRoles] = useState<MemberRole[]>([qRole === "realtor" || qRole === "contractor" ? qRole : "investor"]);
  const role = primaryRole(roles);
  const toggleRole = (r: MemberRole) => setRoles((cur) => (cur.includes(r) ? (cur.length > 1 ? cur.filter((x) => x !== r) : cur) : [...cur, r]));
  const price = monthlyPriceForRoles(roles);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  // Already signed in (including returning from Google): go on.
  useEffect(() => {
    let done = false;
    const go = async () => {
      if (done) return;
      done = true;
      await finishSignIn();
      router.replace(next);
    };
    supabase.auth.getSession().then(({ data }) => data.session && go());
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) void go();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, next]);

  async function google() {
    setBusy(true);
    setError(null);
    sessionStorage.setItem(ROLE_KEY, roles.join(","));
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/login?next=${encodeURIComponent(next)}`,
      extraParams: { prompt: "select_account" },
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed");
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    if (forgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      setBusy(false);
      if (error) setError(error.message);
      else setNotice(`Check ${email} for a password reset link. It may take a few minutes to arrive, and check your spam folder too.`);
      return;
    }
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      if (password !== confirmPassword) {
        setError("Your passwords do not match. Enter the same password in both fields.");
        setBusy(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: { role, roles, first_name: firstName.trim() || null, last_name: lastName.trim() || null },
        },
      });
      if (error) setError(error.message);
      else if (!data.session) {
        setPassword("");
        setConfirmPassword("");
        setNotice(`Your password is set. Check ${email} for a confirmation link (including your spam folder), then sign in with your email and the password you just created.`);
      }
    }
    setBusy(false);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50 to-canvas px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/brand/realtybridge-logo.png" alt="RealtyBridge — Connecting Investors & Realtors" width={487} height={298} className="h-auto w-64 mix-blend-multiply" />
          <h1 className="mt-4 text-2xl font-semibold text-ink">{mode === "signup" && !forgot ? "Create your RealtyBridge account" : "Sign in to RealtyBridge"}</h1>
          <p className="mt-2 text-sm text-muted">The bridge between investors and agents.</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">Connect with local real estate partners. Investors share property deals, and licensed realtors explore opportunities in the markets they serve.</p>
        </div>
        <Card className="p-6 shadow-sm">
          <div className="mb-5 grid grid-cols-2 rounded-lg bg-brand-50 p-1 text-sm font-medium">
            {(["signin", "signup"] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setForgot(false); setError(null); setNotice(null); }} aria-pressed={mode === m} className={cn("rounded-md py-1.5 transition-colors", mode === m ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}>
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {error && <div className="mb-4"><Alert tone="red">{error}</Alert></div>}
          {notice && <div className="mb-4"><Alert tone="green">{notice}</Alert></div>}

          {!forgot && (
            <>
          <p className="mb-2 text-sm font-medium">I&apos;m joining as… <span className="font-normal text-muted">(pick one or more)</span></p>
          <div className="mb-2 grid grid-cols-3 gap-2">
            {([
              ["investor", "Investor", <TrendingUp key="i" className="size-5" />],
              ["realtor", "Realtor / Agent", <Building2 key="r" className="size-5" />],
              ["contractor", "Contractor", <Hammer key="c" className="size-5" />],
            ] as const).map(([value, label, icon]) => (
              <button key={value} type="button" onClick={() => toggleRole(value)} aria-pressed={roles.includes(value)} className={cn("flex flex-col items-center gap-1.5 rounded-[var(--radius-card)] border p-3 text-sm font-medium transition-colors", roles.includes(value) ? "border-brand-600 bg-brand-50 text-brand-700" : "border-border text-slate-600 hover:bg-slate-50")}>
                {icon}
                {label}
              </button>
            ))}
          </div>
            </>
          )}
          {mode === "signup" && (
            <p className="mb-5 text-xs text-muted">
              {price === 0 ? "Investor-only accounts are free, with immediate platform access after email confirmation and accepting the terms. No card, subscription or trial required." : `$${price}/month after a ${TRIAL_DAYS}-day free trial${roles.length > 1 ? " for all your selected profiles" : ""}. Your trial begins only when you subscribe and complete checkout, not when you create an account. No platform access until your trial or subscription is active.`}{" "}
              Investor only is free, Contractor only is $6/month, and any account with Realtor is $25/month total. You can switch between your profiles anytime.
            </p>
          )}

          <Button variant="secondary" size="lg" className="w-full" onClick={google} loading={busy}>
            <GoogleIcon /> Continue with Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" htmlFor="first"><Input id="first" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
                <Field label="Last name" htmlFor="last"><Input id="last" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
              </div>
            )}
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </Field>
            {forgot ? (
              <>
                <p className="text-sm text-muted">We'll email you a secure link to set a new password.</p>
                <Button type="submit" size="lg" className="w-full" loading={busy}>Email me a reset link</Button>
                <button type="button" onClick={() => { setForgot(false); setError(null); setNotice(null); }} className="mx-auto block text-sm font-medium text-brand-600 hover:underline">
                  Back to sign in
                </button>
              </>
            ) : (
              <>
                <Field label={mode === "signup" ? "Create password" : "Password"} htmlFor="password">
                  <Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={8} aria-describedby={mode === "signup" ? "signup-password-help" : undefined} value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
                {mode === "signup" && (
                  <>
                    <p id="signup-password-help" className="text-xs text-muted">Choose a password with at least 8 characters. Use it with your email to sign in next time. Google signups use your Google sign-in instead.</p>
                    <Field label="Confirm password" htmlFor="confirm-password">
                      <Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </Field>
                  </>
                )}
                <Button type="submit" size="lg" className="w-full" loading={busy}>
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
                {mode === "signin" && (
                  <button type="button" onClick={() => { setForgot(true); setError(null); setNotice(null); }} className="mx-auto block text-sm font-medium text-brand-600 hover:underline">
                    Forgot password?
                  </button>
                )}
              </>
            )}
          </form>
        </Card>
        <p className="mt-6 text-center text-xs text-muted">
          New members review and accept the{" "}
          <a href="/terms" target="_blank" className="font-medium text-brand-600 hover:underline">Professional Conduct Agreement &amp; Terms of Service</a>{" "}
          and{" "}
          <a href="/terms#privacy" target="_blank" className="font-medium text-brand-600 hover:underline">Privacy Policy</a>{" "}
          before using RealtyBridge.
        </p>
      </div>
    </main>
  );
}
