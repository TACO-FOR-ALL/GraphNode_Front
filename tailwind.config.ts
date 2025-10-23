/** @type {import('tailwindcss').Config} */
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
    },
  },
  plugins: [
    // 커스텀 유틸리티 추가
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
  ],
};
