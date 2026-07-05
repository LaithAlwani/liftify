// Amazon Associates shop config.
//
// You don't edit the product list by hand. Instead:
//   1. Add your links + categories to `scripts/shop-input.mjs`
//   2. Run `npm run shop:gen` — it follows each link, grabs the ASIN + title +
//      image, and rewrites the SHOP_PRODUCTS block below.
//
// Set your associate tag in NEXT_PUBLIC_AMAZON_TAG. If your store isn't .com,
// set NEXT_PUBLIC_AMAZON_DOMAIN (e.g. "amazon.ca").
export const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_TAG || "";
export const AMAZON_DOMAIN = process.env.NEXT_PUBLIC_AMAZON_DOMAIN || "amazon.com";

export type ShopProduct = {
  id: string;
  title: string;
  category: string;
  blurb?: string;
  price?: string;
  image?: string; // product image URL
  asin?: string; // Amazon ASIN — the tag is appended automatically
  url?: string; // full URL override (used as-is)
};

// shop:generated:start — managed by scripts/gen-shop.mjs; do not edit by hand
export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: "belt",
    title: "Lever Lifting Belt",
    category: "Support",
    blurb: "10mm support for heavy squats and deadlifts.",
  },
  {
    id: "wraps",
    title: "Wrist Wraps",
    category: "Support",
    blurb: "Stiff wraps for pressing and overhead work.",
  },
  {
    id: "creatine",
    title: "Creatine Monohydrate",
    category: "Supplements",
    blurb: "The most studied strength supplement, 5g/day.",
  },
  {
    id: "shaker",
    title: "Protein Shaker",
    category: "Gear",
    blurb: "Leak-proof bottle with a blender ball.",
  },
];
// shop:generated:end

export function productUrl(p: ShopProduct): string | null {
  if (p.url) return p.url;
  if (!p.asin) return null; // not configured yet
  const base = `https://www.${AMAZON_DOMAIN}/dp/${p.asin}`;
  return AMAZON_TAG ? `${base}?tag=${AMAZON_TAG}` : base;
}
