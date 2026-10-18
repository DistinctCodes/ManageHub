"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import type { Payment } from "@/lib/payments-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
/** Poll when the socket is down or silent for this long (matches the backend docs). */
const POLL_FALLBACK_MS = 60_000;

interface PaymentUpdateEvent {
  paymentId: string;
  status: Payment["status"];
}

/**
 * Subscribes to the backend `/payments` gateway and keeps the React Query
 * cache for `["payments", "detail", paymentId]` in sync. If the socket is
 * disconnected, or no event arrives for 60 seconds, the query is refetched.
 */
export function usePaymentStatus(paymentId: string, accessToken: string | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!paymentId || !accessToken) return;

    const queryKey = ["payments", "detail", paymentId];
    let lastEventAt = Date.now();

    const socket: Socket = io(`${API_BASE_URL}/payments`, {
      auth: { token: accessToken },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("subscribe", paymentId);
    });

    socket.on("payment:update", (event: PaymentUpdateEvent) => {
      if (event?.paymentId !== paymentId) return;
      lastEventAt = Date.now();
      queryClient.setQueryData<Payment | undefined>(queryKey, (current) =>
        current ? { ...current, status: event.status } : current,
      );
      void queryClient.invalidateQueries({ queryKey });
    });

    const timer = setInterval(() => {
      if (!socket.connected || Date.now() - lastEventAt >= POLL_FALLBACK_MS) {
        lastEventAt = Date.now();
        void queryClient.invalidateQueries({ queryKey });
      }
    }, POLL_FALLBACK_MS);

    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, [paymentId, accessToken, queryClient]);
}
