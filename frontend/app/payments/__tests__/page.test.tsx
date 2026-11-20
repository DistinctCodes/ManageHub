import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PaymentsPage from "../page";
import { getPaymentsPage } from "@/lib/payments-api";
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
  getPaymentsPage: vi
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

describe("PaymentsPage cursor pagination (issue #2144)", () => {
  it("loads the next page with the cursor returned by the first page", async () => {
    const user = userEvent.setup();
    const payment = {
      id: "pay-1",
      bookingId: "booking-1",
      userId: "u1",
      amount: 1000,
      currency: "USD",
      rail: "FIAT",
      status: "CONFIRMED",
      provider: null,
      providerReference: null,
      expiresAt: null,
      failureReason: null,
      reconciliationAttempts: 0,
      manualReviewReason: null,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
    };
    vi.mocked(getPaymentsPage)
      .mockResolvedValueOnce({ data: [payment as never], nextCursor: "next-page" })
      .mockResolvedValueOnce({ data: [], nextCursor: null });

    renderWithClient(<PaymentsPage />);

    const loadMore = await screen.findByRole("button", { name: "Load more" });
    expect(getPaymentsPage).toHaveBeenCalled();
    await user.click(loadMore);

    await waitFor(() =>
      expect(getPaymentsPage).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: "next-page" }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Load more" })).toBeNull(),
    );
  });
});
