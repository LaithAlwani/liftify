import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Liftify collects, uses, and protects your data.",
  alternates: { canonical: "/privacy" },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page flex-1 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: June 2026
          </p>

          <div className="mt-8 flex flex-col gap-8 leading-relaxed text-muted-foreground">
            <p>
              Liftify (&ldquo;Liftify,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;)
              is a free workout tracker. This policy explains what we collect,
              how we use it, and the choices you have. By using Liftify you agree
              to this policy.
            </p>

            <Section title="Information we collect">
              <p className="mt-1">We collect:</p>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
                <li>
                  <span className="font-medium text-foreground">
                    Account information
                  </span>{" "}
                  — your name and email, handled by our authentication provider
                  (Clerk). If you sign in with Google, we receive your basic
                  Google profile (name, email, avatar).
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Content you create
                  </span>{" "}
                  — workouts (exercises, sets, reps, weights), session and rest
                  times, body weight and measurements, recovery check-ins, and
                  your preferences (units, goals, reminders).
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Notification data
                  </span>{" "}
                  — if you enable push reminders, a push subscription token for
                  your device.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Technical data
                  </span>{" "}
                  — basic device/browser information and data stored locally on
                  your device (e.g. units, text size, an in-progress workout
                  draft, and your rest-timer state).
                </li>
              </ul>
            </Section>

            <Section title="How we use your information">
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
                <li>Provide and sync the app across your devices.</li>
                <li>Show your progress, charts, streaks, and personal records.</li>
                <li>Send the reminders you choose to enable.</li>
                <li>Keep the service secure and fix problems.</li>
              </ul>
              <p className="mt-2">
                We do not sell your personal data, and Liftify does not show
                ads.
              </p>
            </Section>

            <Section title="How your data is stored and shared">
              <p className="mt-1">
                Your data is stored with trusted providers that process it only
                to run Liftify:
              </p>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
                <li>
                  <span className="font-medium text-foreground">Clerk</span> —
                  authentication and account management.
                </li>
                <li>
                  <span className="font-medium text-foreground">Convex</span> —
                  database and backend that stores your workouts and body log.
                </li>
                <li>
                  <span className="font-medium text-foreground">Vercel</span> —
                  application hosting.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Push services
                  </span>{" "}
                  (Apple, Google, Mozilla) — to deliver notifications you enable.
                </li>
              </ul>
              <p className="mt-2">
                <span className="font-medium text-foreground">
                  Affiliate links.
                </span>{" "}
                Our Shop links to products on Amazon. As an Amazon Associate we
                may earn from qualifying purchases. When you follow a link,
                Amazon may set its own cookies and process your activity under
                its privacy policy.
              </p>
              <p className="mt-2">
                <span className="font-medium text-foreground">Donations.</span>{" "}
                Voluntary donations are handled by a third-party provider; we do
                not receive or store your payment-card details.
              </p>
            </Section>

            <Section title="Cookies and local storage">
              <p className="mt-1">
                We use a session cookie from our auth provider to keep you signed
                in, and your browser&apos;s local storage to remember preferences
                and an unsaved workout draft. We do not use advertising or
                cross-site tracking cookies.
              </p>
            </Section>

            <Section title="Push notifications">
              <p className="mt-1">
                Push reminders are opt-in. You can turn them off any time in
                Settings, or revoke notification permission in your browser or
                device settings.
              </p>
            </Section>

            <Section title="Data retention">
              <p className="mt-1">
                We keep your data while your account is active. When you delete
                your account, your workouts, body log, and account data are
                removed.
              </p>
            </Section>

            <Section title="Your rights and choices">
              <p className="mt-1">
                You can view and edit your data in the app at any time, and
                permanently delete your account and all associated data from
                Settings &rarr; Danger zone. Depending on where you live, you may
                have rights to access, correct, export, or erase your personal
                data — contact us to exercise them.
              </p>
            </Section>

            <Section title="Security">
              <p className="mt-1">
                Data is encrypted in transit and stored with reputable
                providers. No method of transmission or storage is 100% secure,
                but we work to protect your information.
              </p>
            </Section>

            <Section title="Children">
              <p className="mt-1">
                Liftify is not directed to children under 13 (or under 16 in the
                EEA/UK), and we do not knowingly collect their data.
              </p>
            </Section>

            <Section title="International users">
              <p className="mt-1">
                Liftify is operated from, and your data may be processed in, the
                United States and other countries where our providers operate.
              </p>
            </Section>

            <Section title="Changes to this policy">
              <p className="mt-1">
                We may update this policy from time to time. Material changes
                will be reflected by the &ldquo;last updated&rdquo; date above.
              </p>
            </Section>

            <Section title="Contact">
              <p className="mt-1">
                Questions or requests? Email us at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-medium text-foreground underline"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </Section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
