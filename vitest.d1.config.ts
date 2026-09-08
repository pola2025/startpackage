import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/d1/**/*.test.ts", "cloudflare-workers/startpackage-data/**/*.test.ts"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./") } },
});
