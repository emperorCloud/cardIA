import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cardia: {
          blue: "#085FFF",
          violet: "#685CF6",
          cyan: "#06D6A0",
          dark: "#081020",
          dark2: "#0D1730",
          panel: "#101B38",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(104, 92, 246, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
