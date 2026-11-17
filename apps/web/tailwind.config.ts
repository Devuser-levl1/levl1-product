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
        // Marketing site tokens — theme-aware RGB triplets defined on .mk-root in
        // app/(marketing)/marketing.css (light + dark). Legacy names
        // (purple/indigo/violet/blue/sky) map to the single indigo accent.
        mk: {
          bg: "rgb(var(--mk-bg) / <alpha-value>)",
          surface: "rgb(var(--mk-surface) / <alpha-value>)",
          mist: "rgb(var(--mk-mist) / <alpha-value>)",
          ink: "rgb(var(--mk-ink) / <alpha-value>)",
          slate: "rgb(var(--mk-slate) / <alpha-value>)",
          muted: "rgb(var(--mk-muted) / <alpha-value>)",
          line: "rgb(var(--mk-line) / <alpha-value>)",
          accent: "rgb(var(--mk-accent) / <alpha-value>)",
          "accent-text": "rgb(var(--mk-accent-text) / <alpha-value>)",
          "accent-soft": "rgb(var(--mk-accent-soft) / <alpha-value>)",
          purple: "rgb(var(--mk-accent-text) / <alpha-value>)",
          indigo: "rgb(var(--mk-accent-text) / <alpha-value>)",
          violet: "rgb(var(--mk-accent-text) / <alpha-value>)",
          blue: "rgb(var(--mk-accent-text) / <alpha-value>)",
          sky: "rgb(var(--mk-accent-text) / <alpha-value>)",
        },
      },
      fontFamily: {
        mkdisplay: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
