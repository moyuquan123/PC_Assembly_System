import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  test: { name: "api", environment: "node", include: ["src/**/*.test.ts"], testTimeout: 15_000 }
});
