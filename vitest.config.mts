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
      // Next compiles root params away; outside it the module only throws.
      "next/root-params": fileURLToPath(
        new URL("./tests/unit/stubs/root-params.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/unit/setup.ts"],
    // next-intl imports `next/navigation` without an extension, which Node's ESM resolver can't
    // find in Next (no exports map); bundling it through Vite resolves it like Next does.
    server: { deps: { inline: ["next-intl"] } },
    // Placeholders so modules that read Sanity config at import time can load in tests.
    env: { NEXT_PUBLIC_SANITY_PROJECT_ID: "test", NEXT_PUBLIC_SANITY_DATASET: "test" },
  },
})
