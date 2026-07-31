import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1F4E78",
          dark: "#163A5A",
          light: "#EAF1F8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
