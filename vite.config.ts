import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Config de Vite para el frontend de Tauri.
// clearScreen/strictPort/fixed port: requeridos por Tauri para dev mode estable.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Debe coincidir con "paths" en tsconfig.json — tsc solo chequea tipos,
    // Vite/esbuild necesita su propio alias para resolver los imports en
    // tiempo de build/dev.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "es2021",
    outDir: "dist",
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
