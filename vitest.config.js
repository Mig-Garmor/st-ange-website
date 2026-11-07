import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["server/**/*.test.js", "chat/**/*.test.js", "src/content/**/*.test.js"], fileParallelism: false } });
