import type { Metadata } from "next";
import { ArrowUpRight, ShoppingBag } from "@phosphor-icons/react/dist/ssr";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { AMAZON_TAG, AMAZON_DOMAIN } from "@/lib/shop";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

// In-app storefront. Affiliate links are now admin-managed in Convex (the
// `affiliateLinks` table); this reads the active ones. Outbound clicks go through
// /api/go/[linkId] so they're tracked. Dynamic so it always reflects the latest
// admin changes (and never fetches Convex at build time).
export const dynamic = "force-dynamic";

const PAGE_TITLE = "Shop — Lifting gear we rate";
const PAGE_DESCRIPTION =
  "Hand-picked lifting essentials — belts, wrist wraps, straps, creatine, protein and more. Curated by Liftify.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
};

const iconTileStyle = {
  backgroundImage:
    "repeating-linear-gradient(45deg,#1c1c22 0 6px,#17171b 6px 12px)",
};

type ShopLink = {
  _id: string;
  title: string;
  category: string;
  blurb?: string;
  image?: string;
  asin?: string;
  url?: string;
};

// The real destination (associate tag appended) — used only for JSON-LD; the
// visible card link points at /api/go so clicks are tracked.
function destUrl(link: ShopLink): string | null {
  if (link.url) return link.url;
  if (!link.asin) return null;
  const base = `https://www.${AMAZON_DOMAIN}/dp/${link.asin}`;
  return AMAZON_TAG ? `${base}?tag=${AMAZON_TAG}` : base;
}

function buildJsonLd(links: ShopLink[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Liftify Shop",
    itemListElement: links.map((link, index) => {
      const href = destUrl(link);
      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: link.title,
          category: link.category,
          ...(link.image ? { image: link.image } : {}),
          ...(href
            ? {
                offers: {
                  "@type": "Offer",
                  url: href,
                  availability: "https://schema.org/InStock",
                },
              }
            : {}),
        },
      };
    }),
  };
}

export default async function ShopPage() {
  const links = (await fetchQuery(api.affiliate.listActive, {})) as ShopLink[];
  const categories = [...new Set(links.map((link) => link.category))];

  return (
    <div className="container-page flex flex-col gap-8 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(links)) }}
      />

      <div className="flex flex-col gap-2">
        <PageHeader eyebrow="Lifting gear we rate" title="Shop" />
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          A short, honest list of the belts, wraps and supplements we actually
          recommend. As an Amazon Associate, Liftify earns from qualifying
          purchases — at no extra cost to you.
        </p>
      </div>

      {categories.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing here yet — check back soon.
        </p>
      )}

      {categories.map((category) => {
        const productsInCategory = links.filter(
          (link) => link.category === category,
        );
        return (
          <section key={category} className="flex flex-col gap-3">
            <h2 className="mono-label text-label-lg text-muted-foreground">
              {category}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {productsInCategory.map((link) => {
                const hasDest = !!(link.url || link.asin);
                return (
                  <Card
                    key={link._id}
                    className="flex flex-col p-4 transition hover:border-accent/35"
                  >
                    <div className="flex items-center gap-3">
                      {link.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={link.image}
                          alt={link.title}
                          className="size-[52px] shrink-0 rounded-field bg-white object-contain"
                        />
                      ) : (
                        <span
                          className="flex size-[52px] shrink-0 items-center justify-center rounded-field text-dim"
                          style={iconTileStyle}
                        >
                          <ShoppingBag weight="regular" className="size-5" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-base font-extrabold leading-tight">
                          {link.title}
                        </p>
                        {link.blurb ? (
                          <p className="mt-1 text-xs leading-snug text-muted-foreground">
                            {link.blurb}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-border pt-3">
                      {hasDest ? (
                        <>
                          <span className="mono-label text-label text-muted-foreground">
                            View on Amazon
                          </span>
                          <a
                            href={`/api/go/${link._id}`}
                            target="_blank"
                            rel="sponsored noopener noreferrer"
                            aria-label={`View ${link.title} on Amazon`}
                            className="flex size-7 items-center justify-center rounded-full bg-accent/10 text-accent transition hover:bg-accent hover:text-accent-foreground"
                          >
                            <ArrowUpRight weight="bold" className="size-3.5" />
                          </a>
                        </>
                      ) : (
                        <span className="mono-label text-label text-dim">
                          Coming soon
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="border-t border-border pt-6 text-xs text-muted-foreground">
        As an Amazon Associate, Liftify earns from qualifying purchases. Prices
        and availability are shown on Amazon and may change.
      </p>
    </div>
  );
}
