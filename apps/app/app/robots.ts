import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

// Let crawlers in. The app pages are behind auth (they redirect to sign-in, so
// they never index with content); the public /shop is what we want found.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
