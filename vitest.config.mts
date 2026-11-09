import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  // tsconfig uses `jsx: "preserve"` for Next.js; tests need JSX compiled.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // `server-only` throws outside React Server Components; tests import server modules directly.
      "server-only": fileURLToPath(new URL("./tests/unit/stubs/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/unit/setup.ts"],
    // Placeholders so modules that read Sanity config at import time can load in tests.
    env: { NEXT_PUBLIC_SANITY_PROJECT_ID: "test", NEXT_PUBLIC_SANITY_DATASET: "test" },
  },
})
