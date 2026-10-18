import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mirror Next's own notFound() behaviour: throw an error whose digest marks
// the 404 HTTP fallback.
vi.mock("next/navigation", () => ({
  notFound: () => {
    const error = new Error("NEXT_HTTP_ERROR_FALLBACK;404") as Error & {
      digest?: string;
    };
    error.digest = "NEXT_HTTP_ERROR_FALLBACK;404";
    throw error;
  },
}));

import ComponentsPage from "../page";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ComponentsPage", () => {
  it("404s in production builds", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() => ComponentsPage()).toThrow(/404/);
  });

  it("renders the catalog for local development", () => {
    vi.stubEnv("NODE_ENV", "development");

    render(<ComponentsPage />);

    expect(screen.getByText(/Component catalog/)).toBeInTheDocument();
  });
});
