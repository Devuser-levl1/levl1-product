import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { ServiceWorkerRegistrar } from "@/components/layout/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://levl1.io"),
  title: "Levl1 — AI Interview Platform",
  description:
    "Voice AI L1 interviews for tech and product roles. Built for recruitment agencies and enterprises.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Levl1 — The AI hiring & interview platform",
    description:
      "Levl1 reads every résumé, scores every candidate, and interviews them for you.",
    siteName: "Levl1",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Levl1 — The AI hiring & interview platform",
    description:
      "Levl1 reads every résumé, scores every candidate, and interviews them for you.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Levl1",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Cashfree Payment SDK */}
        <script src="https://sdk.cashfree.com/js/v3/cashfree.js" async />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              color: "#4F46E5",
              border: "1px solid #E2E8F0",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 13,
              boxShadow: "0 4px 12px rgba(79,70,229,0.08)",
            },
          }}
        />
      </body>
    </html>
  );
}
