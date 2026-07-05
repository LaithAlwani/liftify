import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { Marquee } from "@/components/marquee";
import { Stats } from "@/components/stats";
import { Features } from "@/components/features";
import { CTA } from "@/components/cta";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { SITE_URL, APP_URL } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Liftify",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web, iOS, Android",
  url: SITE_URL,
  installUrl: APP_URL,
  description:
    "A free workout tracker — log lifts in seconds, track sets, rest, and body measurements, and watch your strength climb with charts and PRs.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Marquee />
        <Reveal>
          <Stats />
        </Reveal>
        <Features />
        <Reveal>
          <CTA />
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
