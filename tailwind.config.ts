import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1a1a17",
        "ink-soft": "#4a473f",
        paper: "#faf6ee",
        "paper-raised": "#f2ecdd",
        line: "#ddd4bd",
        accent: "#1e3a5f",
        good: "#2c6e49",
        warn: "#9c4221",
      },
      fontFamily: {
        serif: ["var(--font-newsreader)", "Georgia", "serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
        wordmark: ["var(--font-fraunces)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
