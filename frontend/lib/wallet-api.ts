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

async function walletFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Wallet request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function getWalletStatus(accessToken: string): Promise<WalletStatusResponse> {
  return walletFetch<WalletStatusResponse>("/wallets/me", accessToken);
}

export function provisionCustodialWallet(
  accessToken: string,
): Promise<WalletStatusResponse> {
  return walletFetch<WalletStatusResponse>("/wallets/provision", accessToken, {
    method: "POST",
  });
}

export function requestLinkChallenge(
  accessToken: string,
): Promise<LinkChallengeResponse> {
  return walletFetch<LinkChallengeResponse>(
    "/wallets/link/challenge",
    accessToken,
    { method: "POST" },
  );
}

export function verifyLinkChallenge(
  accessToken: string,
  params: { nonce: string; address: string; signature: string },
): Promise<WalletStatusResponse> {
  return walletFetch<WalletStatusResponse>("/wallets/link/verify", accessToken, {
    method: "POST",
    body: JSON.stringify(params),
  });
}
