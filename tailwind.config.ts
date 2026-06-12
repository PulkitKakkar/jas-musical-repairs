import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1613",
        cream: "#f2f7f9",
        brand: {
          50: "#eeeeff",
          100: "#dadaff",
          500: "#2020ad",
          600: "#000096",
          700: "#000072"
        },
        gold: "#f0702c"
      },
      boxShadow: {
        card: "0 12px 35px rgba(11, 22, 19, 0.08)"
      },
      fontFamily: {
        sans: ["New York", "Iowan Old Style", "Apple Garamond", "Baskerville", "Times New Roman", "serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
