import type { Metadata } from "next";
import { ArrowUpRight, ShoppingBag } from "@phosphor-icons/react/dist/ssr";
import { SHOP_PRODUCTS, productUrl } from "@/lib/shop";

// In-app storefront. Lives inside the (app) group so the persistent nav
// (sidebar + bottom tab bar) stays visible, matching the redesign mockup.

const PAGE_TITLE = "Shop — Lifting gear we rate";
const PAGE_DESCRIPTION =
  "Hand-picked lifting essentials — belts, wrist wraps, straps, creatine, protein and more. Curated by Liftify.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
};

// Steel gradient used for the product icon tile when there is no image.
const iconTileStyle = {
  backgroundImage:
    "repeating-linear-gradient(45deg,#1c1c22 0 6px,#17171b 6px 12px)",
};

// Structured data so the listing is eligible for rich results.
function buildJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Liftify Shop",
    itemListElement: SHOP_PRODUCTS.map((product, index) => {
      const href = productUrl(product);
      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: product.title,
          category: product.category,
          ...(product.image ? { image: product.image } : {}),
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

export default function ShopPage() {
  const categories = [
    ...new Set(SHOP_PRODUCTS.map((product) => product.category)),
  ];

  return (
    <div className="container-page flex flex-col gap-8 py-6 md:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd()) }}
      />

      <div>
        <p className="mono-label text-[11px] text-muted-foreground">
          Lifting gear we rate
        </p>
        <h1 className="font-display text-3xl font-black uppercase sm:text-4xl">
          Shop
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          A short, honest list of the belts, wraps and supplements we actually
          recommend. As an Amazon Associate, Liftify earns from qualifying
          purchases — at no extra cost to you.
        </p>
      </div>

      {categories.map((category) => {
        const productsInCategory = SHOP_PRODUCTS.filter(
          (product) => product.category === category,
        );
        return (
          <section key={category} className="flex flex-col gap-3">
            <h2 className="mono-label text-[11px] tracking-[0.2em] text-muted-foreground">
              {category}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {productsInCategory.map((product) => {
                const href = productUrl(product);
                return (
                  <div
                    key={product.id}
                    className="flex flex-col rounded-2xl border border-border bg-card p-4 transition hover:border-accent/35"
                  >
                    <div className="flex items-center gap-3">
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image}
                          alt={product.title}
                          className="size-[52px] shrink-0 rounded-xl bg-white object-contain"
                        />
                      ) : (
                        <span
                          className="flex size-[52px] shrink-0 items-center justify-center rounded-xl text-dim"
                          style={iconTileStyle}
                        >
                          <ShoppingBag weight="regular" className="size-5" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-base font-extrabold leading-tight">
                          {product.title}
                        </p>
                        {product.blurb ? (
                          <p className="mt-1 text-xs leading-snug text-muted-foreground">
                            {product.blurb}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-border pt-3">
                      {href ? (
                        <>
                          <span className="mono-label text-[10px] tracking-[0.12em] text-muted-foreground">
                            View on Amazon
                          </span>
                          <a
                            href={href}
                            target="_blank"
                            rel="sponsored noopener noreferrer"
                            aria-label={`View ${product.title} on Amazon`}
                            className="flex size-7 items-center justify-center rounded-full bg-accent/10 text-accent transition hover:bg-accent hover:text-accent-foreground"
                          >
                            <ArrowUpRight weight="bold" className="size-3.5" />
                          </a>
                        </>
                      ) : (
                        <span className="mono-label text-[10px] tracking-[0.12em] text-dim">
                          Coming soon
                        </span>
                      )}
                    </div>
                  </div>
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
