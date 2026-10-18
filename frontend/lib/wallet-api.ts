import { request } from "@/lib/http";

export type WalletCustodyType = "CUSTODIAL" | "EXTERNAL";
export type WalletStatus = "PENDING" | "ACTIVE" | "DISABLED";

export interface WalletStatusResponse {
  provisioned: boolean;
  walletAddress: string | null;
  custodyType: WalletCustodyType | null;
  status: WalletStatus | null;
  balance: number;
  currency: string;
}

export interface LinkChallengeResponse {
  nonce: string;
  expiresAt: string;
}

function walletFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    service: "wallet",
    method: init?.method,
    body: init?.body,
    fallbackMessage: (status) => `Wallet request failed (${status})`,
  });
}

export function getWalletStatus(): Promise<WalletStatusResponse> {
  return walletFetch<WalletStatusResponse>("/wallets/me");
}

export function provisionCustodialWallet(): Promise<WalletStatusResponse> {
  return walletFetch<WalletStatusResponse>("/wallets/provision", {
    method: "POST",
  });
}

export function requestLinkChallenge(): Promise<LinkChallengeResponse> {
  return walletFetch<LinkChallengeResponse>("/wallets/link/challenge", {
    method: "POST",
  });
}

export function verifyLinkChallenge(params: {
  nonce: string;
  address: string;
  signature: string;
}): Promise<WalletStatusResponse> {
  return walletFetch<WalletStatusResponse>("/wallets/link/verify", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
