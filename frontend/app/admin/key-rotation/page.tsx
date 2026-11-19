"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, RefreshCw } from "lucide-react";
import {
  getKeyRotationStatus,
  rotateKeys,
  type KeyRotationSummary,
} from "@/lib/admin-api";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  inputClass,
} from "@/components/admin/ui";
import { RequireAdmin } from "@/components/admin/require-admin";

export default function KeyRotationPage() {
  return (
    <RequireAdmin>
      <KeyRotationInner />
    </RequireAdmin>
  );
}

function KeyRotationInner() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ["key-rotation-status"],
    queryFn: () => getKeyRotationStatus(),
  });

  const [fromKeyId, setFromKeyId] = useState("");
  const [toKeyId, setToKeyId] = useState("");
  const [batchSize, setBatchSize] = useState("");
  const [maxBatches, setMaxBatches] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [result, setResult] = useState<KeyRotationSummary | null>(null);

  const rotation = useMutation({
    mutationFn: () =>
      rotateKeys({
        fromKeyId: fromKeyId || status.data?.activeKeyId || "",
        toKeyId: toKeyId.trim(),
        ...(batchSize ? { batchSize: Number(batchSize) } : {}),
        ...(maxBatches ? { maxBatches: Number(maxBatches) } : {}),
      }),
    onSuccess: (summary) => {
      setResult(summary);
      queryClient.invalidateQueries({ queryKey: ["key-rotation-status"] });
      toast.success("Custodial key rotation completed.");
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const activeKeyId = status.data?.activeKeyId ?? "";
  const keyIds = Array.from(
    new Set([
      ...(status.data?.configuredKeyIds ?? []),
      ...(status.data?.keys ?? []).map((key) => key.keyId),
      ...(activeKeyId ? [activeKeyId] : []),
    ]),
  );
  const selectedFrom = fromKeyId || activeKeyId;
  const canRotate =
    (confirmation === "ROTATE" ||
      (toKeyId.trim().length > 0 && confirmation === toKeyId.trim())) &&
    selectedFrom.length > 0 &&
    toKeyId.trim().length > 0 &&
    toKeyId.trim() !== selectedFrom &&
    !rotation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <KeyRound className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
            Custodial key rotation
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Re-wrap wallet data keys from one KMS master key to another. The
            run is idempotent and resumes from where it stopped.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Active KMS key"
          description="Configured write key and the keys still referenced by stored material."
        />
        {status.isLoading ? (
          <p role="status" className="px-5 py-6 text-sm text-gray-500">
            Loading key status…
          </p>
        ) : status.error ? (
          <p role="alert" className="px-5 py-6 text-sm text-red-600 dark:text-red-400">
            {(status.error as Error).message}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3">Key id</th>
                  <th className="px-5 py-3 text-right">Material rows</th>
                  <th className="px-5 py-3">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {keyIds.map((keyId) => {
                  const count =
                    status.data?.keys.find((key) => key.keyId === keyId)?.count ?? 0;
                  return (
                    <tr key={keyId}>
                      <td className="px-5 py-3 font-mono text-xs text-gray-900 dark:text-gray-50">
                        {keyId}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {count}
                      </td>
                      <td className="px-5 py-3">
                        {keyId === activeKeyId ? (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                            Active
                          </Badge>
                        ) : count > 0 ? (
                          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                            Legacy
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            Unused
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {keyIds.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-gray-400">
                      No KMS keys reported.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Rotate keys"
          description="Both key ids must be configured before rotating. Leave the batch fields empty to drain every row in one run."
        />
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (canRotate) {
              rotation.mutate();
            }
          }}
        >
          <Field label="Current key id">
            <select
              className={inputClass}
              value={selectedFrom}
              onChange={(event) => setFromKeyId(event.target.value)}
              disabled={rotation.isPending}
            >
              <option value="">Select a key…</option>
              {keyIds.map((keyId) => (
                <option key={keyId} value={keyId}>
                  {keyId}
                </option>
              ))}
            </select>
          </Field>
          <Field label="New KMS key id">
            <input
              className={inputClass}
              value={toKeyId}
              onChange={(event) => setToKeyId(event.target.value)}
              list="configured-key-ids"
              placeholder="local-master-key-v2"
              disabled={rotation.isPending}
              required
            />
            <datalist id="configured-key-ids">
              {keyIds.map((keyId) => (
                <option key={keyId} value={keyId} />
              ))}
            </datalist>
          </Field>
          <Field label="Batch size (optional)">
            <input
              type="number"
              min={1}
              max={10000}
              className={inputClass}
              value={batchSize}
              onChange={(event) => setBatchSize(event.target.value)}
              disabled={rotation.isPending}
            />
          </Field>
          <Field label="Max batches (optional)">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={maxBatches}
              onChange={(event) => setMaxBatches(event.target.value)}
              disabled={rotation.isPending}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Type ROTATE to confirm">
              <input
                className={inputClass}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="ROTATE"
                disabled={rotation.isPending}
                autoComplete="off"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={!canRotate} className="bg-red-600 hover:bg-red-700">
              <RefreshCw className="h-4 w-4" />
              {rotation.isPending ? "Rotating…" : "Rotate keys"}
            </Button>
          </div>
        </form>
      </Card>

      {rotation.isPending && (
        <Card role="status" className="p-5 text-sm text-gray-600 dark:text-gray-300">
          Rotating keys… progress is committed row by row and can be resumed by
          running the same rotation again.
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader
            title="Rotation result"
            description={`${result.fromKeyId} → ${result.toKeyId}`}
          />
          <dl className="divide-y divide-gray-100 px-5 dark:divide-gray-800">
            <ResultRow label="Rotated" value={result.rotated} />
            <ResultRow label="Failed" value={result.failed} />
            <ResultRow label="Remaining on old key" value={result.remaining} />
          </dl>
        </Card>
      )}
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-3 text-sm">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="font-semibold tabular-nums text-gray-900 dark:text-gray-50">
        {value}
      </dd>
    </div>
  );
}
