/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // 1024px content column plus the 20px side gutters, so padded sections line up with hero text.
      maxWidth: {
        content: "66.5rem",
      },
      colors: {
        brand: {
          yellow: "#F6C220",
          navy: "#011F7C",
        },
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-in-out",
      },
    },
  },
  plugins: [],
};
