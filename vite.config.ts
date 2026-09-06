import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/forest/",
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Vite serves the local UI; the deployed functions keep the API key on the server.
      "/forest/api/": {
        target: "https://sokolov.lv",
        changeOrigin: true,
        proxyTimeout: 125_000,
        timeout: 125_000,
      },
    },
  },
  resolve: {
    alias: {
      "@engine": path.resolve(import.meta.dirname, "engine"),
    },
  },
});
