"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  walletLinkSchema,
  type WalletLinkInput,
} from "@/lib/schemas/wallet-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WalletLinkFormProps {
  nonce: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: WalletLinkInput) => void;
}

export function WalletLinkForm({
  nonce,
  busy,
  onCancel,
  onSubmit,
}: WalletLinkFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WalletLinkInput>({
    resolver: zodResolver(walletLinkSchema),
    mode: "onChange",
  });

  return (
    <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        In your wallet app, sign this one-time code, then paste your address
        and the resulting signature below.
      </p>
      <p className="break-all rounded bg-gray-100 p-2 font-mono text-xs dark:bg-gray-900">
        {nonce}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-1">
          <Input
            placeholder="Wallet address"
            aria-label="Wallet address"
            {...register("address")}
          />
          {errors.address && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.address.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Input
            placeholder="Signature"
            aria-label="Signature"
            {...register("signature")}
          />
          {errors.signature && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.signature.message}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
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
