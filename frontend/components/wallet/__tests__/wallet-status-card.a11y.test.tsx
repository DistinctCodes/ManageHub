import { render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WalletStatusCard } from "../wallet-status-card";
import * as walletApi from "@/lib/wallet-api";

expect.extend(toHaveNoViolations);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WalletStatusCard accessibility", () => {
  it("has no axe violations while loading", async () => {
    vi.spyOn(walletApi, "getWalletStatus").mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <WalletStatusCard accessToken="test-token" />,
    );

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

    const { container } = render(
      <WalletStatusCard accessToken="test-token" />,
    );

    await waitFor(() =>
      expect(screen.getByText(/USD credit/)).toBeInTheDocument(),
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations, and announces the error, on a fetch failure", async () => {
    vi.spyOn(walletApi, "getWalletStatus").mockRejectedValue(
      new Error("Wallet request failed (500)"),
    );

    const { container } = render(
      <WalletStatusCard accessToken="test-token" />,
    );

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
