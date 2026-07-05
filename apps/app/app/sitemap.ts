import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

// The publicly indexable pages. (The gated app pages are intentionally omitted.)
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${APP_URL}/sign-up`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
