import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "InterviewCentral — AI Voice Interview Platform",
  description:
    "Automate candidate screening with AI voice interviews. Hire smarter, faster.",
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
              color: "#0F2147",
              border: "1px solid #E2E8F0",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 13,
              boxShadow: "0 4px 12px rgba(15,33,71,0.08)",
            },
          }}
        />
      </body>
    </html>
  );
}
