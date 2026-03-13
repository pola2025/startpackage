import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#e8edf2",
          100: "#c5cfd9",
          200: "#9fafc0",
          300: "#7990a7",
          400: "#5a7893",
          500: "#3b6080",
          600: "#2d4d6b",
          700: "#1f3044",
          800: "#1b2838",
          900: "#0d1b2a",
        },
        gold: {
          50: "#faf6eb",
          100: "#f0e8cc",
          200: "#e5d9ad",
          300: "#d9c88c",
          400: "#d4b86a",
          500: "#c9a84c",
          600: "#b8942f",
          700: "#9a7a22",
          800: "#7c6118",
          900: "#5e490f",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        terra: {
          50: "#faefed",
          100: "#ecd0cc",
          200: "#ddb1a9",
          300: "#cd9286",
          400: "#be7363",
          500: "#b85e52",
          600: "#8b3f35",
          700: "#6e3229",
          800: "#51251e",
          900: "#341812",
        },
        ok: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        neon: {
          white: "#ffffff",
          red: "#ff0055",
          green: "#00ff88",
          orange: "#ff9500",
          cyan: "#00f0ff",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "neon-white": "0 0 20px rgba(255, 255, 255, 0.5)",
        "neon-red": "0 0 20px rgba(255, 0, 85, 0.5)",
        "neon-green": "0 0 20px rgba(0, 255, 136, 0.5)",
        "neon-orange": "0 0 20px rgba(255, 149, 0, 0.5)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
