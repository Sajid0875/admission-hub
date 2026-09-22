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
        primary: {
          DEFAULT: "#4648d4",
          container: "#6063ee",
          fixed: "#e1e0ff",
          "fixed-dim": "#c0c1ff",
          "on-fixed": "#07006c",
          "on-fixed-variant": "#2f2ebe",
          hover: "#3d3fb8",
        },
        "on-primary": "#ffffff",
        "on-primary-container": "#fffbff",
        secondary: {
          DEFAULT: "#565e74",
          container: "#dae2fd",
          "on-container": "#5c647a",
          fixed: "#dae2fd",
          "fixed-dim": "#bec6e0",
        },
        "on-secondary": "#ffffff",
        tertiary: {
          DEFAULT: "#4f5f76",
          container: "#68788f",
          "on-container": "#000510",
          fixed: "#d3e4fe",
          "fixed-dim": "#b7c8e1",
        },
        "on-tertiary": "#ffffff",
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
          "on-container": "#93000a",
        },
        "on-error": "#ffffff",
        surface: {
          DEFAULT: "#ffffff",
          dim: "#d9dadb",
          bright: "#f8f9fa",
          "container-lowest": "#ffffff",
          "container-low": "#f3f4f5",
          container: "#edeeef",
          "container-high": "#e7e8e9",
          "container-highest": "#e1e3e4",
          variant: "#e1e3e4",
        },
        "on-surface": "#191c1d",
        "on-surface-variant": "#464554",
        "inverse-surface": "#2e3132",
        "inverse-on-surface": "#f0f1f2",
        outline: {
          DEFAULT: "#767586",
          variant: "#e2e8f0",
        },
        background: "#f8f9fa",
        "on-background": "#191c1d",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
      boxShadow: {
        soft: "0px 4px 6px -1px rgba(0, 0, 0, 0.05), 0px 2px 4px -1px rgba(0, 0, 0, 0.03)",
        elevated: "0px 10px 15px -3px rgba(0, 0, 0, 0.08), 0px 4px 6px -2px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
