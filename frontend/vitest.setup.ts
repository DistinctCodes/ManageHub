import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// RTL's automatic afterEach(cleanup) only registers itself when it detects a
// global `afterEach` (i.e. `test.globals: true`). This project doesn't set
// globals, so without this, each render() in a test file leaves its DOM
// mounted for the next test, breaking any query that expects a single match.
afterEach(cleanup);
