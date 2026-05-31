import plugin from "tailwindcss/plugin";
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0ea5e9", /* Vibrant Sky Blue */
        secondary: "#10b981", /* Vibrant Emerald Green */
        accent: "#f97316", /* Warm Amber Orange */
        cta: "#0ea5e9",
        background: "#0f172a", /* Deep Charcoal */
        text: "#f8fafc", /* Soft White for dark theme */
        clay: {
          peach: "#FDBCB4", /* Soft Peach */
          sky: "#ADD8E6", /* Baby Blue */
          mint: "#B9F6CA", /* Soft Mint — calmer than neon #98FF98 for contrast */
          lilac: "#E6E6FA", /* Lilac */
          ink: "#334155", /* slate-700 — soft warm-dark text for clay surfaces */
        },
      },
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      spacing: {
        xs: "0.25rem",
        sm: "0.5rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2rem",
      },
      boxShadow: {
        soft: "0 2px 4px rgba(15, 23, 42, 0.05)",
        card: "0 4px 12px rgba(15, 23, 42, 0.08)",
        floating: "0 8px 24px rgba(15, 23, 42, 0.12)",
        modal: "0 24px 48px -12px rgba(15, 23, 42, 0.25)",
      },
      borderRadius: {
        DEFAULT: "0.75rem",
        lg: "1.25rem",
        xl: "2rem",
        full: "9999px",
      },
      backgroundImage: {
        "map-bg": "radial-gradient(circle, rgba(251, 207, 232, 0.5) 0%, transparent 100%)",
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities, addComponents }) {
      addUtilities({
        ".map-bg": {
          "background-image": "theme('backgroundImage.map-bg')",
        },
        ".text-macaron": {
          "background-image": "linear-gradient(to right, #f472b6, #fb923c, #fb7185)",
          "-webkit-background-clip": "text",
          "background-clip": "text",
          color: "transparent",
        },
        ".macaron-gradient": {
          background: "linear-gradient(120deg, #ffd9df 0%, #c7e7ff 100%)",
        },
      });
      addComponents({
        ".glass-panel": {
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.6))",
          "backdrop-filter": "blur(16px)",
          "-webkit-backdrop-filter": "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.7)",
          "box-shadow": "0 4px 24px rgba(0, 0, 0, 0.05)",
          "border-radius": "1.5rem",
        },
        ".glass-node": {
          background: "rgba(255, 255, 255, 0.6)",
          "backdrop-filter": "blur(8px)",
          "-webkit-backdrop-filter": "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.8)",
          "box-shadow": "0 2px 8px rgba(0, 0, 0, 0.04)",
          "border-radius": "1rem",
        },
      });
    }),
  ],
} satisfies Config;
