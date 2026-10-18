import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PaymentsPage from "../page";
import { useSessionStore } from "@/lib/stores/session-store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/payments",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/stores/use-session-bootstrap", () => ({
  useSessionBootstrap: () => {},
}));

// Mock the API module: the query itself then simulates the rejected session
// that a real 401 produces, so the page shows the raw error instead of
// pretending the request is retryable.
vi.mock("@/lib/payments-api", () => ({
  getPayments: vi
    .fn()
    .mockRejectedValue(new Error("Request failed (401): Unauthorized")),
}));

function renderWithClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  useSessionStore.setState(
    {
      user: { id: "u1", email: "a@example.com", role: "user" },
      accessToken: "memory-only",
      status: "authenticated",
    },
    false,
  );
});

afterEach(() => {
  useSessionStore.setState(
    { user: null, accessToken: null, status: "unknown" },
    false,
  );
});

describe("PaymentsPage with a rejected session after reload (issue #1977)", () => {
  it("surfaces the failure instead of showing cached or empty data", async () => {
    // A stale user in the store (post-reload /auth/me restore) lets the query
    // start; the 401 must surface as an error message, not silent emptiness.
    renderWithClient(<PaymentsPage />);
    await waitFor(() =>
      expect(screen.getByText(/Unauthorized/)).toBeInTheDocument(),
    );
    expect(
      screen.queryByText("No payments yet."),
    ).not.toBeInTheDocument();
  });

  it("still asks members to sign in when the store knows no session", () => {
    useSessionStore.setState(
      { user: null, accessToken: null, status: "unauthenticated" },
      false,
    );

    renderWithClient(<PaymentsPage />);

    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });
});
