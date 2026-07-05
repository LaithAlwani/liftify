// Turns the link list in `shop-input.mjs` into the SHOP_PRODUCTS block in
// `lib/shop.ts`. For each entry it follows the link (so amzn.to short links
// work), pulls the ASIN out of the final URL, and best-effort reads the page's
// Open Graph title + image. Run with:  npm run shop:gen
//
// Note: it never scrapes prices (Amazon's Associates terms restrict showing
// scraped prices) — set `price` manually in shop-input.mjs if you want one.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import input from "./shop-input.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const shopFile = resolve(here, "../lib/shop.ts");

const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "accept-language": "en-US,en;q=0.9",
};

// Pull a 10-char ASIN out of an Amazon URL (several URL shapes are possible).
function extractAsin(url) {
  if (!url) return "";
  const fromPath = url.match(
    /\/(?:dp|gp\/product|gp\/aw\/d|dp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i,
  );
  if (fromPath) return fromPath[1].toUpperCase();
  const fromQuery = url.match(/[?&]asin=([A-Z0-9]{10})/i);
  return fromQuery ? fromQuery[1].toUpperCase() : "";
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// Read a <meta property="og:..." content="..."> value (either attribute order).
function readMeta(html, property) {
  const orderA = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]*\\scontent=["']([^"']*)["']`,
    "i",
  );
  const orderB = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
    "i",
  );
  const match = html.match(orderA) || html.match(orderB);
  return match ? decodeEntities(match[1]) : "";
}

// "Amazon.com: Brand Title : Health & Household" -> "Brand Title"
function cleanTitle(raw) {
  if (!raw) return "";
  const withoutPrefix = raw.replace(/^Amazon\.[a-z.]+\s*:\s*/i, "");
  return withoutPrefix.split(/\s+:\s+/)[0].trim();
}

function slugify(text) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "item"
  );
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function buildProduct(entry, usedIds) {
  if (!entry?.url) {
    console.warn(`! Skipping an entry with no "url" (category: ${entry?.category ?? "?"})`);
    return null;
  }

  let finalUrl = entry.url;
  let html = "";
  try {
    const response = await fetch(entry.url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    finalUrl = response.url || entry.url;
    html = await response.text();
  } catch {
    console.warn(`! Could not fetch ${entry.url} — keeping link only, fill in title manually.`);
  }

  const asin = extractAsin(finalUrl) || extractAsin(entry.url);
  const ogTitle = cleanTitle(readMeta(html, "og:title"));
  const ogImage = readMeta(html, "og:image");

  const title = entry.title || ogTitle || `${entry.category ?? "Gear"} pick`;
  const image = entry.image || ogImage || undefined;

  // Stable, unique id.
  let id = slugify(entry.id || title || asin || entry.category || "item");
  while (usedIds.has(id)) id = `${id}-2`;
  usedIds.add(id);

  const product = {
    id,
    title,
    category: entry.category || "Gear",
    blurb: entry.blurb || undefined,
    price: entry.price || undefined,
    image,
    asin: asin || undefined,
    // Only fall back to the raw url when we couldn't find an ASIN.
    url: asin ? undefined : entry.url,
  };

  const status = asin ? `ASIN ${asin}` : "NO ASIN (using raw url)";
  console.log(`✓ ${product.category} · ${title}  [${status}]${image ? " · image ✓" : ""}`);
  return { product, domain: domainOf(finalUrl) };
}

function toLiteral(product) {
  const lines = [];
  const push = (key, value) => {
    if (value !== undefined && value !== "") lines.push(`    ${key}: ${JSON.stringify(value)},`);
  };
  push("id", product.id);
  push("title", product.title);
  push("category", product.category);
  push("blurb", product.blurb);
  push("price", product.price);
  push("image", product.image);
  push("asin", product.asin);
  push("url", product.url);
  return `  {\n${lines.join("\n")}\n  },`;
}

async function main() {
  if (!Array.isArray(input) || input.length === 0) {
    console.log("shop-input.mjs is empty — add some links, then re-run. Nothing changed.");
    return;
  }

  const usedIds = new Set();
  const results = [];
  for (const entry of input) {
    const built = await buildProduct(entry, usedIds);
    if (built) results.push(built);
  }

  if (results.length === 0) {
    console.log("No usable products produced. Nothing changed.");
    return;
  }

  // Warn if the links point at a non-.com store and the env doesn't match.
  const domains = [...new Set(results.map((r) => r.domain).filter(Boolean))];
  const configured = process.env.NEXT_PUBLIC_AMAZON_DOMAIN || "amazon.com";
  for (const domain of domains) {
    if (domain && domain !== configured) {
      console.warn(
        `! Links use ${domain} but NEXT_PUBLIC_AMAZON_DOMAIN is "${configured}". ` +
          `Set NEXT_PUBLIC_AMAZON_DOMAIN=${domain} so affiliate links use the right store.`,
      );
    }
  }

  const block = `export const SHOP_PRODUCTS: ShopProduct[] = [\n${results
    .map((r) => toLiteral(r.product))
    .join("\n")}\n];`;

  const source = await readFile(shopFile, "utf8");
  const marker = /(\/\/ shop:generated:start[^\n]*\n)[\s\S]*?(\/\/ shop:generated:end)/;
  if (!marker.test(source)) {
    console.error("Could not find the shop:generated markers in lib/shop.ts. Aborting.");
    process.exit(1);
  }
  const updated = source.replace(marker, (_all, start, end) => `${start}${block}\n${end}`);
  await writeFile(shopFile, updated, "utf8");

  console.log(`\nWrote ${results.length} product(s) to lib/shop.ts. Review the diff, then commit + redeploy.`);
}

main();
