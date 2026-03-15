import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#7F77DD",
          dark: "#5447CB",
          soft: "#B8B1F7"
        },
        ink: "#0F0F0F",
        mist: "#FAFAFA"
      },
      boxShadow: {
        glow: "0 18px 45px rgba(127, 119, 221, 0.22)"
      },
      backgroundImage: {
        "radial-grid":
          "radial-gradient(circle at top, rgba(127, 119, 221, 0.2), transparent 35%), radial-gradient(circle at bottom, rgba(15, 15, 15, 0.92), rgba(15, 15, 15, 1))"
      }
    }
  },
  darkMode: "class",
  plugins: []
};

export default config;
