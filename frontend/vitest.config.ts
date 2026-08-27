import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The test/test:cov scripts already exist in package.json, but there was no
// vitest config -- without one, Vite falls back to tsconfig's "jsx": "preserve"
// (correct for Next's own compiler, unsupported by esbuild) and component
// tests fail to parse before a single test runs. This gives component tests
// a working JSX transform, jsdom environment, and the "@/*" path alias.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
