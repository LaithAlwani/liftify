import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Archivo } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "./providers";
import { RegisterSW } from "@/components/register-sw";
import { AppleSplash } from "@/components/apple-splash";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Archivo is the loud "display" face used for headline numbers, wordmark, and
// big titles. It carries an italic used for the slanted hero words.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"),
  title: "Liftify — Track workouts fast",
  description: "Log workouts in seconds and watch your progress over time.",
  manifest: "/manifest.webmanifest",
  // Favicon + iOS icon come from the file conventions app/icon.png and
  // app/apple-icon.png (the volt logo mark), so no manual icons map is needed.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Liftify",
  },
};

export const viewport: Viewport = {
  // Match the app's nav bars (surface-2) so the mobile status/navigation bars
  // blend with the top header and bottom tab bar instead of showing white.
  themeColor: "#0c0c0e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#d7f24a",
          colorBackground: "#141417",
          colorText: "#f4f4f2",
          colorInputBackground: "#0a0a0c",
          colorInputText: "#f4f4f2",
          colorNeutral: "#f4f4f2",
        },
      }}
    >
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <AppleSplash />
          {/* Apply the saved text size before paint to avoid a flash. */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                "(function(){try{var s=localStorage.getItem('liftify:font-size');var m={sm:'14px',base:'16px',lg:'18px'};if(s&&m[s]){document.documentElement.style.fontSize=m[s];}}catch(e){}})();",
            }}
          />
          <Providers>{children}</Providers>
          <RegisterSW />
        </body>
      </html>
    </ClerkProvider>
  );
}
