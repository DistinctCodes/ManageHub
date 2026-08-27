import { z } from "zod";

const STELLAR_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;

export const walletLinkSchema = z.object({
  address: z
    .string()
    .trim()
    .min(1, "Wallet address is required")
    .regex(
      STELLAR_ADDRESS_REGEX,
      "Address must be a valid Stellar public key (starts with G, 56 characters)",
    ),
  signature: z
    .string()
    .trim()
    .min(1, "Signature is required")
    .min(8, "Signature looks too short to be valid"),
});

export type WalletLinkInput = z.infer<typeof walletLinkSchema>;
