import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe, toHaveNoViolations } from "jest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WalletStatusCard } from "../wallet-status-card";
import * as walletApi from "@/lib/wallet-api";

expect.extend(toHaveNoViolations);

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * WalletStatusCard calls useQuery/useMutation, which throw ("No QueryClient
 * set") without a QueryClientProvider ancestor — pre-existing gap in this
 * file (it doesn't take an `accessToken` prop; auth comes from
 * useSessionStore), fixed alongside adding the state-coverage suite in
 * wallet-status-card.test.tsx.
 */
function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <WalletStatusCard />
    </QueryClientProvider>,
  );
}

describe("WalletStatusCard accessibility", () => {
  it("has no axe violations while loading", async () => {
    vi.spyOn(walletApi, "getWalletStatus").mockReturnValue(new Promise(() => {}));

    const { container } = renderCard();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading your wallet",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations once loaded with a provisioned wallet", async () => {
    vi.spyOn(walletApi, "getWalletStatus").mockResolvedValue({
      provisioned: true,
      walletAddress: "GABCDEFTEST",
      custodyType: "CUSTODIAL",
      status: "ACTIVE",
      balance: 1234,
      currency: "USD",
    });

    const { container } = renderCard();

    await waitFor(() =>
      expect(screen.getByText(/USD credit/)).toBeInTheDocument(),
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations, and announces the error, on a fetch failure", async () => {
    vi.spyOn(walletApi, "getWalletStatus").mockRejectedValue(
      new Error("Wallet request failed (500)"),
    );

    const { container } = renderCard();

    await waitFor(() =>
      expect(
        screen.getAllByText("Wallet request failed (500)"),
      ).not.toHaveLength(0),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Wallet request failed (500)",
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
