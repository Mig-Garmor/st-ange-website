import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Pages from "vite-plugin-pages";
import svgLoader from "vite-svg-loader";

import path from "path";

export default defineConfig({
  plugins: [
    vue(),
    Pages({
      dirs: "src/pages", // default
      extensions: ["vue"],
    }),
    svgLoader(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@styles": path.resolve(__dirname, "./src/styles"),
      "@composables": path.resolve(__dirname, "./src/composables"),
      "@modules": path.resolve(__dirname, "./src/modules"),
      "@api": path.resolve(__dirname, "./src/api"),
    },
  },
  publicDir: "public",
  build: {
    outDir: "dist",
  },
});
