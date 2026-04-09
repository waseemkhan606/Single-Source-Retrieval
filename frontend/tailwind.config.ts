import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "nb-bg":     "#FFFBF0",
        "nb-blue":   "#4D96FF",
        "nb-yellow": "#FFD93D",
        "nb-green":  "#6BCB77",
        "nb-red":    "#FF6B6B",
        "nb-purple": "#C77DFF",
        "nb-orange": "#FF9A3C",
      },
      fontFamily: {
        sans: ["Space Grotesk", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      boxShadow: {
        "nb":    "4px 4px 0px 0px #000000",
        "nb-sm": "3px 3px 0px 0px #000000",
        "nb-lg": "6px 6px 0px 0px #000000",
        "nb-xl": "8px 8px 0px 0px #000000",
        "nb-press": "2px 2px 0px 0px #000000",
      },
      borderRadius: {
        nb: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
