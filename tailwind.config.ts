/** @type {import('tailwindcss').Config} */

const typeSizes = {
  // x-small
  xs: { fontSize: "12px", lineHeight: "16px" },
  // small
  sm: { fontSize: "14px", lineHeight: "20px" },
  // base
  base: { fontSize: "16px", lineHeight: "24px" },

  // headline
  h1: { fontSize: "96px", lineHeight: "1.1" },
  h2: { fontSize: "60px", lineHeight: "1.15" },
  h3: { fontSize: "48px", lineHeight: "1.2" },
  h4: { fontSize: "34px", lineHeight: "1.2" },
  h5: { fontSize: "24px", lineHeight: "1.25" },
  h6: { fontSize: "20px", lineHeight: "1.3" },

  // subtitle
  sub1: { fontSize: "16px", lineHeight: "24px" },
  sub2: { fontSize: "14px", lineHeight: "20px" },
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./electron/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"NotoSansKR"', "system-ui", "-apple-system", "sans-serif"],
        mono: [
          '"NotoSansKR"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        // text
        primary: "#111827",
        secondary: "#6B7280",
        placeholder: "#D1D5D8",
        "brand-blue": "#2B89F8",

        // brand
        "brand-dark-blue": "#1660EF",
        "brand-light-blue1": "#1E6FF3",
        "brand-light-blue2": "#31A3FA",
        "brand-light-blue3": "#36BFFA",

        // semantic
        "semantic-green": "#5EE981",
        "semantic-dark-green": "#97FFB1",
        "semantic-light-green": "#C6FFD4",
        "semantic-orange": "#FFBC5F",
        "semantic-dark-orange": "#FFD498",
        "semantic-light-orange": "#FFE6C2",
        "semantic-red": "#F8622B",
        "semantic-dark-red": "#FF9067",
        "semantic-light-red": "#FFB59A",

        // layer
        "layer-primary": "#FFFFFF",
        "layer-black": "#000000",
        "layer-secondary": "#FAFAFA",
      },
    },
  },
  plugins: [
    // Electron Drag Space
    function ({ addUtilities }) {
      const newUtilities = {
        ".drag-region": {
          "-webkit-app-region": "drag",
        },
        ".no-drag": {
          "-webkit-app-region": "no-drag",
        },
      };
      addUtilities(newUtilities);
    },

    function ({ addUtilities, e }) {
      // type size utility: .ty-{key}
      const sizeUtils = Object.entries(typeSizes).reduce((acc, [k, v]) => {
        acc[`.ty-${e(k)}`] = {
          fontSize: v.fontSize,
          lineHeight: v.lineHeight === "auto" ? "normal" : v.lineHeight,
        };
        return acc;
      }, {});
      addUtilities(sizeUtils, { variants: ["responsive"] });

      // font weight utility: .ty-w-regular / .ty-w-medium / .ty-w-semibold
      addUtilities({
        ".ty-w-thin": { fontWeight: "100" },
        ".ty-w-extralight": { fontWeight: "200" },
        ".ty-w-light": { fontWeight: "300" },
        ".ty-w-regular": { fontWeight: "400" },
        ".ty-w-medium": { fontWeight: "500" },
        ".ty-w-semibold": { fontWeight: "600" },
        ".ty-w-bold": { fontWeight: "700" },
        ".ty-w-extrabold": { fontWeight: "800" },
        ".ty-w-black": { fontWeight: "900" },
      });
    },
  ],
};
