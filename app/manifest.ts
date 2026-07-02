import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Liftify",
    short_name: "Liftify",
    description: "Track workouts fast and see progress over time.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Splash uses the app canvas; the system bars (theme_color) match the
    // top/bottom nav bars, which are `surface-2` — so no white system bar.
    background_color: "#0a0a0c",
    theme_color: "#0c0c0e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
