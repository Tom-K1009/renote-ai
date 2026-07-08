import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        paper: "#f7f3eb",
        sage: "#6f8f72",
        coral: "#d87a63",
        skyline: "#6c8fb0"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(31, 41, 51, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
