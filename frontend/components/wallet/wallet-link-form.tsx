"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  walletLinkSchema,
  type WalletLinkInput,
} from "@/lib/schemas/wallet-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FreighterResponse {
  address?: string;
  signedMessage?: string | null;
  error?: string | { message?: string };
}

interface FreighterApi {
  getAddress: () => Promise<FreighterResponse | string>;
  signMessage: (
    message: string,
    options: { address: string },
  ) => Promise<FreighterResponse | string>;
}

declare global {
  interface Window {
    freighterApi?: FreighterApi;
  }
}

interface WalletLinkFormProps {
  nonce: string;
  message: string;
  busy: boolean;
  /**
   * Prefills the fields, e.g. with the values from a submission that was
   * optimistically applied and then rolled back (issue #1866).
   */
  defaultValues?: Partial<WalletLinkInput>;
  onCancel: () => void;
  onSubmit: (values: WalletLinkInput) => void;
}

function freighterError(result: unknown): string | null {
  if (result && typeof result === "object" && "error" in result) {
    const error = (result as FreighterResponse).error;
    if (typeof error === "string" && error.length > 0) return error;
    if (
      error &&
      typeof error === "object" &&
      typeof error.message === "string" &&
      error.message.length > 0
    ) {
      return error.message;
    }
  }
  return null;
}

function freighterAddress(result: unknown): string | null {
  if (typeof result === "string") return result || null;
  if (result && typeof result === "object" && "address" in result) {
    const address = (result as FreighterResponse).address;
    return typeof address === "string" && address.length > 0 ? address : null;
  }
  return null;
}

function freighterSignature(result: unknown): string | null {
  if (typeof result === "string") return result || null;
  if (result && typeof result === "object" && "signedMessage" in result) {
    const signature = (result as FreighterResponse).signedMessage;
    return typeof signature === "string" && signature.length > 0
      ? signature
      : null;
  }
  return null;
}

export function WalletLinkForm({
  nonce,
  message,
  busy,
  defaultValues,
  onCancel,
  onSubmit,
}: WalletLinkFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<WalletLinkInput>({
    resolver: zodResolver(walletLinkSchema),
    defaultValues,
    mode: "onTouched",
    reValidateMode: "onChange",
  });
  const [connecting, setConnecting] = useState(false);
  const [freighterMessage, setFreighterMessage] = useState<string | null>(null);

  async function connectFreighter() {
    setFreighterMessage(null);
    const api = typeof window === "undefined" ? undefined : window.freighterApi;
    if (!api) {
      setFreighterMessage(
        "Freighter is not installed. Sign manually below instead.",
      );
      return;
    }

    setConnecting(true);
    try {
      if (!message) {
        throw new Error("Challenge message is unavailable. Request a new one.");
      }
      const addressResult = await api.getAddress();
      const addressError = freighterError(addressResult);
      if (addressError) throw new Error(addressError);
      const address = freighterAddress(addressResult);
      if (!address) throw new Error("Freighter did not return an address.");

      const signatureResult = await api.signMessage(message, { address });
      const signatureError = freighterError(signatureResult);
      if (signatureError) throw new Error(signatureError);
      const signature = freighterSignature(signatureResult);
      if (!signature) throw new Error("Freighter did not return a signature.");

      setValue("address", address, { shouldValidate: true });
      setValue("signature", signature, { shouldValidate: true });
      await handleSubmit(onSubmit)();
    } catch (error) {
      setFreighterMessage(
        error instanceof Error
          ? error.message
          : "Could not connect Freighter. Sign manually below instead.",
      );
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Sign this exact message with Freighter or your wallet app, then paste
        the address and signature below. The backend verifies the entire
        message, not just the nonce.
      </p>
      <pre className="break-all whitespace-pre-wrap rounded bg-gray-100 p-2 font-mono text-xs dark:bg-gray-900">
        {message || nonce}
      </pre>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Challenge nonce: <span className="font-mono">{nonce}</span>
      </p>

      <Button
        type="button"
        onClick={connectFreighter}
        disabled={busy || connecting}
      >
        {connecting ? "Waiting for Freighter..." : "Connect Freighter"}
      </Button>
      {freighterMessage && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {freighterMessage}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-1">
          <Input
            placeholder="Wallet address"
            aria-label="Wallet address"
            aria-invalid={errors.address ? true : undefined}
            aria-describedby={
              errors.address ? "wallet-address-error" : undefined
            }
            {...register("address")}
          />
          {errors.address && (
            <p id="wallet-address-error" className="text-xs text-red-600 dark:text-red-400">
              {errors.address.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Input
            placeholder="Signature"
            aria-label="Signature"
            aria-invalid={errors.signature ? true : undefined}
            aria-describedby={
              errors.signature ? "wallet-signature-error" : undefined
            }
            {...register("signature")}
          />
          {errors.signature && (
            <p id="wallet-signature-error" className="text-xs text-red-600 dark:text-red-400">
              {errors.signature.message}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={busy || connecting}>
            {busy ? "Verifying..." : "Connect wallet"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        If you lose access to this wallet, we cannot recover it for you - we
        never hold the keys to a connected wallet.
      </p>
    </div>
  );
}
