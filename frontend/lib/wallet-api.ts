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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function walletFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    credentials: "same-origin",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Wallet request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
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
