import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  preview: {
    realtime: true, // live "designs left today" count (src/lib/quota.tsx)
  },
  // Provisioned but not used by the app: login is self-hosted Better Auth (src/lib/auth.ts) on this
  // Postgres, because Managed Auth's SDK has no React Native/Expo client.
  auth: true,
  // Images: OpenAI directly + ImageKit storage (not the AI Gateway / Neon buckets, by choice).
  functions: {
    generate: {
      name: "Generate design",
      source: "./functions/generate.ts",
      env: {
        OPENAI_API_KEY: { value: process.env.OPENAI_API_KEY, required: true },
        IMAGEKIT_PRIVATE_KEY: { value: process.env.IMAGEKIT_PRIVATE_KEY, required: true },
        IMAGEKIT_URL_ENDPOINT: { value: process.env.IMAGEKIT_URL_ENDPOINT, required: true },
      },
    },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
