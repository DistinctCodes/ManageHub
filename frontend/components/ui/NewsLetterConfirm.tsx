"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import Link from "next/link";

type ConfirmResponse = {
  success: boolean;
  message: string;
};

type Props = {
  token: string | null;
};

export function NewsletterConfirm({ token }: Props) {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState<string>("Confirming your subscription...");

  const trimmedToken = useMemo(() => token?.trim() ?? null, [token]);

  useEffect(() => {
    let cancelled = false;

    async function confirm() {
      if (!trimmedToken) {
        setStatus("error");
        setMessage("Missing confirmation token.");
        return;
      }

      try {
        const res = await apiClient.post<ConfirmResponse, { token: string }>(
          "/newsletter/confirm",
          { token: trimmedToken }
        );

        if (cancelled) return;

        setStatus(res.success ? "success" : "error");
        setMessage(res.message || (res.success ? "Subscription confirmed!" : "Confirmation failed."));
      } catch (err) {
        if (cancelled) return;

        const msg =
          err instanceof Error ? err.message : "Confirmation failed.";
        setStatus("error");
        setMessage(msg);
      }
    }

    confirm();

    return () => {
      cancelled = true;
    };
  }, [trimmedToken]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 bg-[#f8fafc]">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Newsletter Confirmation
        </h1>

        <p
          className={[
            "text-sm leading-6",
            status === "error" ? "text-red-600" : "text-gray-700",
          ].join(" ")}
        >
          {message}
        </p>

        {status === "success" && (
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center justify-center bg-blue-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go back home
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="mt-6">
            <Link
              href="/#notify"
              className="inline-flex items-center justify-center bg-gray-900 text-white font-medium px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Try subscribing again
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
