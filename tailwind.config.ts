import plugin from "tailwindcss/plugin";
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Must stay in sync with the semantic tokens in src/index.css @theme. */
        primary: "#b25936", /* Terracotta, deep enough for white text (AA) */
        secondary: "#5f8b6f", /* Sage — success, desaturated on purpose */
        accent: "#dc7d50", /* Terracotta at the reference artwork's tone */
        cta: "#b25936",
        background: "#fbfaf7", /* Warm paper — light is the default theme */
        text: "#1f1511", /* Warm ink */
        clay: {
          peach: "#f1d0bd", /* Clay tint */
          sky: "#f2ddcd", /* Sand tint (was baby blue — off-palette) */
          mint: "#cfe7d6", /* Pale sage */
          lilac: "#ebe3db", /* Warm taupe (was lilac — off-palette) */
          ink: "#493d36", /* Warm-dark text for clay surfaces */
        },
      },
      fontFamily: {
        heading: ["Sentient", "Noto Serif TC", "Georgia", "serif"],
        body: ["system-ui", "-apple-system", "Segoe UI", "Noto Sans TC", "sans-serif"],
        display: ["Sentient", "Noto Serif TC", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      spacing: {
        xs: "0.25rem",
        sm: "0.5rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(49, 38, 32, 0.05)",
        card: "0 2px 6px -1px rgba(49, 38, 32, 0.07), 0 1px 2px rgba(49, 38, 32, 0.04)",
        floating: "0 6px 16px -4px rgba(49, 38, 32, 0.10), 0 2px 4px rgba(49, 38, 32, 0.05)",
        modal: "0 18px 40px -12px rgba(49, 38, 32, 0.22)",
      },
      borderRadius: {
        DEFAULT: "0.75rem",
        lg: "1.25rem",
        xl: "2rem",
        full: "9999px",
      },
      backgroundImage: {
        "map-bg": "radial-gradient(circle, rgba(247, 215, 195, 0.5) 0%, transparent 100%)",
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities, addComponents }) {
      addUtilities({
        ".map-bg": {
          "background-image": "theme('backgroundImage.map-bg')",
        },
        ".macaron-gradient": {
          background: "linear-gradient(120deg, #f7e6d8 0%, #f1d0bd 100%)",
        },
      });
      addComponents({
        ".glass-panel": {
          background: "linear-gradient(180deg, rgba(255, 253, 250, 0.82), rgba(253, 249, 244, 0.62))",
          "backdrop-filter": "blur(16px)",
          "-webkit-backdrop-filter": "blur(16px)",
          border: "1px solid rgba(255, 252, 247, 0.72)",
          "box-shadow": "0 2px 10px -2px rgba(49, 38, 32, 0.07)",
          "border-radius": "1.5rem",
        },
        ".glass-node": {
          background: "rgba(255, 253, 250, 0.62)",
          "backdrop-filter": "blur(8px)",
          "-webkit-backdrop-filter": "blur(8px)",
          border: "1px solid rgba(255, 252, 247, 0.8)",
          "box-shadow": "0 1px 5px -1px rgba(49, 38, 32, 0.05)",
          "border-radius": "1rem",
        },
      });
    }),
  ],
} satisfies Config;
