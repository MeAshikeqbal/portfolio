/**
 * Configuration for the `sanity` CLI (`npx sanity <command>`).
 * https://www.sanity.io/docs/cli
 */
import { defineCliConfig } from "sanity/cli"

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET

export default defineCliConfig({
  api: { projectId, dataset },
  typegen: {
    path: [
      "./app/**/*.{ts,tsx}",
      "./components/**/*.{ts,tsx}",
      "./lib/**/*.ts",
      "./sanity/**/*.ts",
    ],
    schema: "./schema.json",
    generates: "./sanity.types.ts",
    overloadClientMethods: true,
  },
})
