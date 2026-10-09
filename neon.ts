import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  // AI Gateway remains disabled until a model integration is requested.
  buckets: {
    beisawa: { access: "public_read" },
    "beisawa-drafts": { access: "private" },
  },
  functions: {
    api: {
      name: "BeiSawa API",
      source: "./neon/api.ts",
      env: {
        BEISAWA_ENGINE_URL: process.env.BEISAWA_ENGINE_URL!,
        BEISAWA_APPROVERS: process.env.BEISAWA_APPROVERS || "{}",
      },
    },
  },
});
