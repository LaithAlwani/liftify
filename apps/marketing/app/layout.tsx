import type { Metadata } from "next";
import { Geist, Geist_Mono, Archivo } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Archivo — the display voice (headlines, stats, logotype). Heavy + italic.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

const DESCRIPTION =
  "Liftify is a free workout tracker — log lifts in seconds, track sets, rest, " +
  "and body measurements, and watch your strength climb with charts and PRs.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Liftify — Free workout tracker",
    template: "%s · Liftify",
  },
  description: DESCRIPTION,
  applicationName: "Liftify",
  keywords: [
    "workout tracker",
    "free workout app",
    "gym log app",
    "weight lifting tracker",
    "strength training app",
    "progressive overload",
    "exercise log",
    "rep and set tracker",
    "body measurement tracker",
    "PWA fitness app",
  ],
  authors: [{ name: "Liftify" }],
  creator: "Liftify",
  publisher: "Liftify",
  category: "fitness",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Liftify",
    title: "Liftify — Free workout tracker",
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Liftify — Free workout tracker",
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
