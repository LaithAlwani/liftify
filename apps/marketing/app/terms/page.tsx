import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using Liftify.",
  alternates: { canonical: "/terms" },
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

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page flex-1 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: June 2026
          </p>

          <div className="mt-8 flex flex-col gap-8 leading-relaxed text-muted-foreground">
            <p>
              These Terms govern your use of Liftify (&ldquo;Liftify,&rdquo;
              &ldquo;we,&rdquo; &ldquo;us&rdquo;), a free workout tracker. By
              creating an account or using the app, you agree to these Terms. If
              you don&apos;t agree, please don&apos;t use Liftify.
            </p>

            <Section title="The service">
              <p className="mt-1">
                Liftify lets you log workouts, track body measurements, and view
                your progress. It is provided free of charge, on an
                &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We may
                add, change, or remove features over time.
              </p>
            </Section>

            <Section title="Eligibility">
              <p className="mt-1">
                You must be at least 13 years old (16 in the EEA/UK) and able to
                form a binding agreement to use Liftify.
              </p>
            </Section>

            <Section title="Your account">
              <p className="mt-1">
                Accounts are created and secured through our authentication
                provider. You&apos;re responsible for keeping your login secure
                and for activity under your account.
              </p>
            </Section>

            <Section title="Acceptable use">
              <p className="mt-1">You agree not to:</p>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
                <li>Use Liftify for any unlawful purpose.</li>
                <li>
                  Disrupt, overload, or attempt to gain unauthorized access to
                  the service or other users&apos; data.
                </li>
                <li>
                  Scrape, reverse-engineer, or resell the service except as
                  permitted by law.
                </li>
              </ul>
            </Section>

            <Section title="Your content">
              <p className="mt-1">
                You own the workout and body data you create. You grant us a
                limited license to store and process it solely to provide the
                service to you. You&apos;re responsible for the accuracy of what
                you log, and you can delete your data at any time.
              </p>
            </Section>

            <Section title="Health &amp; fitness disclaimer">
              <p className="mt-1">
                Liftify is a tracking tool — it is{" "}
                <span className="font-medium text-foreground">
                  not medical, health, or professional fitness advice
                </span>
                . Estimated one-rep maxes, volume, and other figures are
                approximations. Exercise carries inherent risks; consult a
                qualified professional before starting or changing a program,
                and train within your limits. You use Liftify and exercise at
                your own risk.
              </p>
            </Section>

            <Section title="Affiliate links">
              <p className="mt-1">
                The Shop may contain affiliate links (including Amazon
                Associates). If you buy through them, we may earn a commission at
                no extra cost to you. Third-party stores are governed by their
                own terms and policies.
              </p>
            </Section>

            <Section title="Donations">
              <p className="mt-1">
                Donations are voluntary, processed by a third-party provider, and
                generally non-refundable. They don&apos;t grant any additional
                features — Liftify is free for everyone.
              </p>
            </Section>

            <Section title="Third-party services">
              <p className="mt-1">
                Liftify relies on third parties (such as Clerk, Convex, Vercel,
                and push providers). Their services are governed by their own
                terms, and we&apos;re not responsible for them.
              </p>
            </Section>

            <Section title="Availability">
              <p className="mt-1">
                We aim to keep Liftify available but don&apos;t guarantee
                uninterrupted or error-free service, and we may modify or
                discontinue it at any time.
              </p>
            </Section>

            <Section title="Disclaimers &amp; limitation of liability">
              <p className="mt-1">
                To the fullest extent permitted by law, Liftify is provided
                without warranties of any kind, and we are not liable for any
                indirect, incidental, or consequential damages, or for any loss
                of data, arising from your use of the service.
              </p>
            </Section>

            <Section title="Termination">
              <p className="mt-1">
                You may stop using Liftify and delete your account at any time
                from Settings. We may suspend or terminate access if you violate
                these Terms or misuse the service.
              </p>
            </Section>

            <Section title="Changes to these terms">
              <p className="mt-1">
                We may update these Terms from time to time. Continued use after
                changes take effect means you accept the updated Terms.
              </p>
            </Section>

            <Section title="Contact">
              <p className="mt-1">
                Questions about these Terms? Email us at{" "}
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
