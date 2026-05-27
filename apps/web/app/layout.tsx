import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Levl1 — AI Interview Platform",
  description:
    "Voice AI L1 interviews for tech and product roles. Built for recruitment agencies and enterprises.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
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
