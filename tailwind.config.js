/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sección 54: verde oscuro, blanco, gris claro
        brand: {
          DEFAULT: "#0B3D2E",
          dark: "#082C21",
          light: "#F5F7F6",
        },
      },
      fontSize: {
        // Tipografía grande para la pantalla de venta (touch-friendly, sección 11)
        pos: ["1.25rem", { lineHeight: "1.75rem" }],
      },
    },
  },
  plugins: [],
};
