import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["server/**/*.test.js", "chat/**/*.test.js"], fileParallelism: false } });
