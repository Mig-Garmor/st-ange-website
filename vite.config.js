import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Pages from "vite-plugin-pages";
import svgLoader from "vite-svg-loader";

import fs from "fs";
import path from "path";

import { business, services } from "./src/config/business.js";

const prerenderedRoutes = [];

function staticRoutes(paths) {
  const routes = paths.filter((route) => !route.includes(":"));
  routes.push(...services.map((service) => `/services/${service.slug}`));
  prerenderedRoutes.splice(0, prerenderedRoutes.length, ...routes);
  return routes;
}

function writeSitemap(outDir) {
  const urls = prerenderedRoutes
    .map((route) => `  <url><loc>${new URL(route, business.siteUrl).href}</loc></url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  fs.writeFileSync(path.join(outDir, "sitemap.xml"), xml);
}

export default defineConfig({
  plugins: [
    vue(),
    Pages({
      dirs: "src/pages",
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
  ssgOptions: {
    dirStyle: "flat",
    formatting: "minify",
    includedRoutes: staticRoutes,
    onFinished: (outDir) => writeSitemap(outDir ?? path.resolve(__dirname, "dist")),
  },
});
