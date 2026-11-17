// Professional Conduct Agreement, Terms of Service & Privacy Policy shown at signup and at /terms.
import { CONTACT_EMAIL, TERMS_VERSION } from "./terms";

const ENFORCEMENT_STEPS = [
  { step: "1st Offense", title: "Written Warning", body: "Issue documented & logged", tone: "border-amber-200 bg-amber-50 text-amber-900" },
  { step: "2nd Offense", title: "Final Written Warning", body: "Feature restriction / temporary suspension", tone: "border-orange-200 bg-orange-50 text-orange-900" },
  { step: "3rd Offense", title: "Permanent Platform Ban", body: "Account termination, license revocation, access barred", tone: "border-red-200 bg-red-50 text-red-900" },
];

function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-8 mb-3 scroll-mt-6 text-lg font-semibold text-ink first:mt-0">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 mb-2 font-semibold text-ink">{children}</h3>;
}

export function ConductAgreement() {
  return (
    <article className="text-sm leading-relaxed text-slate-700">
      <p>
        By registering, accessing, or using RealtyBridge, you acknowledge and agree to adhere strictly to the following Code of Conduct and Platform Guidelines.
        This agreement governs all users, including Real Estate Investors, Wholesalers, Licensed Real Estate Agents, and Brokers.
      </p>

      <H2>1. Professional Standard of Conduct</H2>
      <p>
        Our marketplace relies on trust, integrity, and transparency. All participants are expected to maintain the highest level of professional ethics in every
        interaction, communication, and transaction initiated through the platform.
      </p>
      <H3>User Expectations</H3>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-ink">Truthful Representation:</span> Real estate investors must post accurate property details, contractual terms,
          assignment/novation terms, clear chain-of-title disclosures, and accurate financial estimations. Licensed realtors must maintain active, in-good-standing
          licensing in the state(s) where they operate.
        </li>
        <li>
          <span className="font-medium text-ink">Respectful Communication:</span> All communications—whether through direct messaging, deal comments, or review
          feedback—must remain professional, courteous, and non-harassing. Threatening language, discriminatory remarks, or personal attacks will not be tolerated.
        </li>
        <li>
          <span className="font-medium text-ink">Good-Faith Negotiation:</span> Users agree to conduct deal discussions and agency/listing negotiations in good faith,
          adhering to applicable local, state, and federal real estate laws and regulations.
        </li>
      </ul>

      <H2>2. Enforcement &amp; Disciplinary Policy</H2>
      <p>To protect the safety, reputation, and legality of the marketplace, platform administration strictly enforces compliance with this Code of Conduct.</p>

      <ol className="my-5 grid gap-3 sm:grid-cols-3" aria-label="Enforcement steps">
        {ENFORCEMENT_STEPS.map((s, i) => (
          <li key={s.step} className={`relative rounded-[var(--radius-card)] border p-4 ${s.tone}`}>
            <p className="text-xs font-semibold tracking-wide uppercase opacity-80">{s.step}</p>
            <p className="mt-1 font-semibold">{s.title}</p>
            <p className="mt-1 text-xs opacity-90">{s.body}</p>
            {i < ENFORCEMENT_STEPS.length - 1 && (
              <span aria-hidden className="absolute top-1/2 -right-2.5 z-10 hidden -translate-y-1/2 text-slate-400 sm:block">
                ›
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="-mt-2 mb-4 text-xs text-muted">Steps may be skipped at admin discretion.</p>

      <H3>Warning &amp; Banning Rules</H3>
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          <span className="font-medium text-ink">Two-Warning Protocol:</span> Violations of this Code of Conduct will result in a formal documented warning. Upon
          receipt of two (2) warnings, a third infraction will result in an immediate and permanent account ban.
        </li>
        <li>
          <span className="font-medium text-ink">Administrative Discretion:</span> Platform administrators reserve the unilateral right to issue warnings, restrict
          feature access, suspend accounts, or issue immediate permanent bans without prior notice for egregious violations (including, but not limited to, fraud,
          intentional misrepresentation, harassment, or illegal activity).
        </li>
        <li>
          <span className="font-medium text-ink">Effects of Permanent Ban:</span> Banned users forfeit access to active listings, match histories, buyer/agent
          contacts, and accrued reviews. Re-registering under a new identity or business entity to circumvent a ban is strictly prohibited and subject to legal action.
        </li>
      </ol>

      <H2>3. Mutual Reviews &amp; Reputation Integrity</H2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Reviews and ratings must reflect genuine transaction experiences.</li>
        <li>Coercion, review swapping, extortion, or posting false/retaliatory reviews is a direct violation of this policy and subject to immediate administrative intervention.</li>
      </ul>

      <H2>4. Listings &amp; License Information</H2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-ink">Deal posts are not pre-screened.</span> Investor posts go live when they are published. Each investor is solely
          responsible for the accuracy and legality of their posts. RealtyBridge may remove any post at its discretion.
        </li>
        <li>
          <span className="font-medium text-ink">License numbers are self-reported.</span> Realtors enter their own license number. RealtyBridge does not review
          or verify licenses. By entering a license number, a realtor represents that it is their own active, in-good-standing license. Investors should
          confirm a realtor&apos;s license with the state licensing authority before engaging them.
        </li>
        <li>RealtyBridge is a connection platform. It is not a real estate broker and is not a party to any agreement between members.</li>
      </ul>

      <H2 id="privacy">5. Privacy Policy</H2>
      <p>This section explains what personal information RealtyBridge collects, how it is used and shared, and the choices you have.</p>

      <H3>Information we collect</H3>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-ink">Account and profile:</span> name, email address, phone number, company or team name, profile photo, bio, markets
          served and, for realtors, license number, licensing state, brokerage and services offered. If you sign in with Google, we receive your name, email
          address and profile photo from Google.
        </li>
        <li>
          <span className="font-medium text-ink">Activity:</span> deals you post (including property addresses), interest you express, matches, reported deal
          outcomes, reviews, flags, blocks and notifications.
        </li>
        <li>
          <span className="font-medium text-ink">Agreement records:</span> the version of this agreement you accepted, when, and your browser&apos;s user agent.
        </li>
        <li>
          <span className="font-medium text-ink">Billing:</span> subscription status and Stripe customer and subscription identifiers. Card details are entered
          on and stored by Stripe. RealtyBridge never sees or stores your full card number.
        </li>
        <li>
          <span className="font-medium text-ink">Technical:</span> sign-in session cookies required to keep you signed in, and standard server logs (such as IP
          address and browser type) kept by our hosting providers.
        </li>
      </ul>

      <H3>How we use it</H3>
      <p>
        To run the marketplace: create and secure your account, show your profile to other members, match deals with realtors in the right state, send sign-in
        codes and notifications, process subscriptions, calculate ratings and success rates, enforce this agreement and comply with the law.
      </p>

      <H3>What other members see</H3>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Signed-in members can see your public profile: name, photo, company or brokerage, bio, markets, services, ratings, reviews, success rate and, for
          realtors, license number and licensing state.
        </li>
        <li>
          Your email address and phone number are shared only with the member you are matched with on a deal. A property&apos;s street address is shared only
          with the realtor matched to that deal.
        </li>
        <li>Your billing information is never shown to other members.</li>
      </ul>

      <H3>Service providers</H3>
      <p>
        We share information only as needed with providers that run RealtyBridge on our behalf: database, authentication and file storage (Supabase), website
        hosting (Vercel), payments (Stripe), email delivery, and Google if you choose Google sign-in. We may also disclose information when required by law, to
        protect members or the platform, or as part of a sale or reorganization of the business.{" "}
        <span className="font-medium text-ink">We do not sell your personal information</span> and do not share it for third-party advertising.
      </p>

      <H3>Retention, security &amp; your choices</H3>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          We keep your information while your account is active. When an account is deleted, its profile, deals, matches and reviews are deleted. Agreement and
          billing records may be kept as long as needed for legal, tax and dispute purposes.
        </li>
        <li>You can view and update most of your information on your Profile and Settings pages, and manage or cancel billing through the billing portal.</li>
        <li>
          To request a copy of your information, a correction, or deletion of your account, contact us
          {CONTACT_EMAIL ? (
            <>
              {" "}at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">
                {CONTACT_EMAIL}
              </a>
            </>
          ) : (
            " through RealtyBridge support"
          )}
          . Depending on where you live, you may have additional privacy rights under state law.
        </li>
        <li>We use reasonable technical and organizational safeguards, but no system is completely secure.</li>
        <li>RealtyBridge is for business use by adults and is not directed to anyone under 18.</li>
      </ul>
      <p className="mt-3">We may update this policy. Material changes will be presented for acceptance the next time you use RealtyBridge.</p>

      <p className="mt-8 text-xs text-muted">Version {TERMS_VERSION}</p>
    </article>
  );
}
