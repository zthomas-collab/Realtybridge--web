import Link from "@/lib/next/link";
import { ConductAgreement } from "@/lib/legal/conduct-agreement";
import { Logo } from "@/components/logo";


// Public: readable before signing up and linked from the login page and settings.
export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <Logo />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Professional Conduct Agreement, Terms of Service &amp; Privacy Policy</h1>
        <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 sm:p-8">
          <ConductAgreement />
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/dashboard" className="text-brand-600 hover:underline">
            Back to RealtyBridge
          </Link>
        </p>
      </main>
    </div>
  );
}
