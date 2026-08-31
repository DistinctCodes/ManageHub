import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WalletStatusCard } from "../wallet-status-card";
import * as walletApi from "@/lib/wallet-api";
import type { WalletStatusResponse } from "@/lib/wallet-api";

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * WalletStatusCard renders <Card>/<CardContent> unconditionally and calls
 * useQuery/useMutation, which throw ("No QueryClient set") without a
 * QueryClientProvider ancestor — a fresh client per test keeps React Query's
 * cache from leaking state between tests.
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

const UNPROVISIONED: WalletStatusResponse = {
  provisioned: false,
  walletAddress: null,
  custodyType: null,
  status: null,
  balance: 0,
  currency: "USD",
};

const PROVISIONED_CUSTODIAL: WalletStatusResponse = {
  provisioned: true,
  walletAddress: "GCUSTODIALADDRESS",
  custodyType: "CUSTODIAL",
  status: "ACTIVE",
  balance: 500,
  currency: "USD",
};

const VALID_STELLAR_ADDRESS = `G${"A".repeat(55)}`;

describe("WalletStatusCard", () => {
  describe("initial load", () => {
    it("shows a loading state while the status request is in flight", () => {
      vi.spyOn(walletApi, "getWalletStatus").mockReturnValue(
        new Promise(() => {}),
      );

      renderCard();

      expect(screen.getByRole("status")).toHaveTextContent(
        "Loading your wallet",
      );
    });

    it("shows the unprovisioned prompt once loaded with no wallet", async () => {
      vi.spyOn(walletApi, "getWalletStatus").mockResolvedValue(UNPROVISIONED);

      renderCard();

      await waitFor(() =>
        expect(
          screen.getByText(/don't have a payment balance set up yet/),
        ).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("button", { name: "Get started" }),
      ).toBeInTheDocument();
    });

    it("shows the formatted balance once loaded with a provisioned wallet", async () => {
      vi.spyOn(walletApi, "getWalletStatus").mockResolvedValue(
        PROVISIONED_CUSTODIAL,
      );

      renderCard();

      await waitFor(() =>
        expect(screen.getByText("5.00 USD credit")).toBeInTheDocument(),
      );
    });
  });

  describe("load error", () => {
    it("displays the error message and announces it via the live region", async () => {
      vi.spyOn(walletApi, "getWalletStatus").mockRejectedValue(
        new Error("Wallet request failed (500)"),
      );

      renderCard();

      await waitFor(() =>
        expect(
          screen.getAllByText("Wallet request failed (500)").length,
        ).toBeGreaterThan(0),
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "Wallet request failed (500)",
      );
    });
  });

  describe("provision flow", () => {
    it("provisions a wallet and shows the balance on success", async () => {
      const user = userEvent.setup();
      vi.spyOn(walletApi, "getWalletStatus").mockResolvedValue(UNPROVISIONED);
      const provisionSpy = vi
        .spyOn(walletApi, "provisionCustodialWallet")
        .mockResolvedValue(PROVISIONED_CUSTODIAL);

      renderCard();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Get started" }),
        ).toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: "Get started" }));

      expect(provisionSpy).toHaveBeenCalledTimes(1);
      await waitFor(() =>
        expect(screen.getByText("5.00 USD credit")).toBeInTheDocument(),
      );
    });

    it("shows the error message when provisioning fails", async () => {
      const user = userEvent.setup();
      vi.spyOn(walletApi, "getWalletStatus").mockResolvedValue(UNPROVISIONED);
      vi.spyOn(walletApi, "provisionCustodialWallet").mockRejectedValue(
        new Error("Wallet request failed (503)"),
      );

      renderCard();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Get started" }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: "Get started" }));

      await waitFor(() =>
        expect(
          screen.getAllByText("Wallet request failed (503)").length,
        ).toBeGreaterThan(0),
      );
    });
  });

  describe("link-challenge flow", () => {
    it("requests a challenge and shows the link form on success", async () => {
      const user = userEvent.setup();
      vi.spyOn(walletApi, "getWalletStatus").mockResolvedValue(
        PROVISIONED_CUSTODIAL,
      );
      const challengeSpy = vi
        .spyOn(walletApi, "requestLinkChallenge")
        .mockResolvedValue({ nonce: "test-nonce", expiresAt: "2099-01-01T00:00:00Z" });

      renderCard();
      await waitFor(() =>
        expect(
          screen.getByRole("button", {
            name: "Connect a wallet you already own instead",
          }),
        ).toBeInTheDocument(),
      );

      await user.click(
        screen.getByRole("button", {
          name: "Connect a wallet you already own instead",
        }),
      );

      expect(challengeSpy).toHaveBeenCalledTimes(1);
      await waitFor(() =>
        expect(screen.getByText("test-nonce")).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("button", { name: "Connect wallet" }),
      ).toBeInTheDocument();
    });
  });

  describe("link-verify flow", () => {
    async function openLinkForm(user: ReturnType<typeof userEvent.setup>) {
      vi.spyOn(walletApi, "getWalletStatus").mockResolvedValue(
        PROVISIONED_CUSTODIAL,
      );
      vi.spyOn(walletApi, "requestLinkChallenge").mockResolvedValue({
        nonce: "test-nonce",
        expiresAt: "2099-01-01T00:00:00Z",
      });

      renderCard();
      await waitFor(() =>
        expect(
          screen.getByRole("button", {
            name: "Connect a wallet you already own instead",
          }),
        ).toBeInTheDocument(),
      );
      await user.click(
        screen.getByRole("button", {
          name: "Connect a wallet you already own instead",
        }),
      );
      await waitFor(() =>
        expect(screen.getByText("test-nonce")).toBeInTheDocument(),
      );
    }

    it("verifies successfully and returns to the balance view", async () => {
      const user = userEvent.setup();
      await openLinkForm(user);

      const verifySpy = vi.spyOn(walletApi, "verifyLinkChallenge").mockResolvedValue({
        ...PROVISIONED_CUSTODIAL,
        custodyType: "EXTERNAL",
        walletAddress: VALID_STELLAR_ADDRESS,
      });

      await user.type(
        screen.getByLabelText("Wallet address"),
        VALID_STELLAR_ADDRESS,
      );
      await user.type(screen.getByLabelText("Signature"), "a-valid-signature");
      await user.click(screen.getByRole("button", { name: "Connect wallet" }));

      await waitFor(() =>
        expect(verifySpy).toHaveBeenCalledWith({
          nonce: "test-nonce",
          address: VALID_STELLAR_ADDRESS,
          signature: "a-valid-signature",
        }),
      );
      // The form closes and the balance view returns on success.
      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: "Connect wallet" }),
        ).not.toBeInTheDocument(),
      );
    });

    it("shows the error message and keeps the form open when verification fails", async () => {
      const user = userEvent.setup();
      await openLinkForm(user);

      vi.spyOn(walletApi, "verifyLinkChallenge").mockRejectedValue(
        new Error("Signature verification failed"),
      );

      await user.type(
        screen.getByLabelText("Wallet address"),
        VALID_STELLAR_ADDRESS,
      );
      await user.type(screen.getByLabelText("Signature"), "a-valid-signature");
      await user.click(screen.getByRole("button", { name: "Connect wallet" }));

      await waitFor(() =>
        expect(
          screen.getAllByText("Signature verification failed").length,
        ).toBeGreaterThan(0),
      );
      // The form stays open — verification failing shouldn't discard the
      // user's in-progress link attempt.
      expect(
        screen.getByRole("button", { name: "Connect wallet" }),
      ).toBeInTheDocument();
    });
  });
});
