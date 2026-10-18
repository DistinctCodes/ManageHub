import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  init: vi.fn(),
  replayIntegration: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// RTL's automatic afterEach(cleanup) only registers itself when it detects a
// global `afterEach` (i.e. `test.globals: true`). This project doesn't set
// globals, so without this, each render() in a test file leaves its DOM
// mounted for the next test, breaking any query that expects a single match.
afterEach(cleanup);
