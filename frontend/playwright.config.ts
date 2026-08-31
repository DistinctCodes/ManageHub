import { defineConfig } from "@playwright/test";

// There was no Playwright config in this repo before -- without one,
// `playwright test` defaults to scanning the whole working directory for
// **/*.@(test|spec).?(c|m)[jt]s?(x), which collides with vitest's unit
// tests under components/**/__tests__ (Playwright's runner loads them via
// require(), and vitest's package refuses to be require()'d, throwing
// "Vitest cannot be imported in a CommonJS module"). Scoping testDir to
// ./e2e keeps the two runners out of each other's way.
export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:3000",
  },
  // Starts the app itself so `npx playwright test` (and the CI e2e job) work
  // standalone, without a separately-started dev server. `reuseExistingServer`
  // lets a developer keep running `npm run dev` locally instead of paying for
  // a second server start on every local test run.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
