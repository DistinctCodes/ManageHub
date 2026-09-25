import { z } from "zod";

const STELLAR_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;

export const walletLinkSchema = z.object({
  address: z
    .string()
    .trim()
    .min(1, "Wallet address is required")
    // Accept either case from the user, but validate (and submit) the
    // canonical uppercase form so a paste of a lowercased key isn't
    // rejected client-side for the wrong reason. See #1814.
    .toUpperCase()
    .pipe(
      z
        .string()
        .regex(
          STELLAR_ADDRESS_REGEX,
          "Address must be a valid Stellar public key (starts with G, 56 characters)",
        ),
    ),
  signature: z
    .string()
    .trim()
    .min(1, "Signature is required")
    .min(8, "Signature looks too short to be valid"),
});

export type WalletLinkInput = z.infer<typeof walletLinkSchema>;