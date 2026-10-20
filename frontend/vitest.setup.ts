import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// API unit tests exercise our reporting payloads, not the Next.js Sentry
// runtime. Keep the SDK's webpack instrumentation out of the jsdom runner.
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({})),
}));

// RTL's automatic afterEach(cleanup) only registers itself when it detects a
// global `afterEach` (i.e. `test.globals: true`). This project doesn't set
// globals, so without this, each render() in a test file leaves its DOM
// mounted for the next test, breaking any query that expects a single match.
afterEach(cleanup);
