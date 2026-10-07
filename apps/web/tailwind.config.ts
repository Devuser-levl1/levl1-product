import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Marketing site tokens (additive; mirrors components/marketing/tokens.ts).
        mk: {
          purple: "#6D28D9",
          indigo: "#4F46E5",
          violet: "#7C3AED",
          blue: "#2563EB",
          sky: "#38BDF8",
          ink: "#0B1020",
          slate: "#475569",
          muted: "#64748B",
          line: "#E7E9F5",
          mist: "#F5F7FF",
        },
      },
      fontFamily: {
        mkdisplay: ["'Plus Jakarta Sans'", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
