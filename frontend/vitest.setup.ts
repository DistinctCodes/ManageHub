import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// API unit tests exercise our reporting payloads, not the Next.js Sentry
// runtime. Keep the SDK's webpack instrumentation out of the jsdom runner.
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({})),
}));
