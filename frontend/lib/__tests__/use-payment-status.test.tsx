import { act, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePaymentStatus } from "../use-payment-status";

const socketMocks = vi.hoisted(() => ({
  handlers: {} as Record<string, (value?: unknown) => void>,
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
}));
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    get connected() { return socketMocks.connected; },
    on: (event: string, handler: (value?: unknown) => void) => { socketMocks.handlers[event] = handler; return this; },
    emit: socketMocks.emit,
    disconnect: socketMocks.disconnect,
  })),
}));

function Probe() {
  const client = useQueryClient();
  usePaymentStatus("pay-123", "secret-token");
  return <button onClick={() => client.setQueryData(["payments", "detail", "pay-123"], { id: "pay-123", status: "INITIATED" })}>Seed</button>;
}

describe("usePaymentStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    socketMocks.handlers = {};
    socketMocks.connected = false;
    socketMocks.emit.mockClear();
    socketMocks.disconnect.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("subscribes to payment updates and refreshes cached status for matching events", async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue();
    const view = render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
    act(() => { socketMocks.handlers.connect(); });
    expect(socketMocks.emit).toHaveBeenCalledWith("subscribe", "pay-123");
    view.getByRole("button", { name: "Seed" }).click();
    act(() => { socketMocks.handlers["payment:update"]({ paymentId: "other", status: "CONFIRMED" }); });
    expect(client.getQueryData(["payments", "detail", "pay-123"])).toMatchObject({ status: "INITIATED" });
    act(() => { socketMocks.handlers["payment:update"]({ paymentId: "pay-123", status: "CONFIRMED" }); });
    expect(client.getQueryData(["payments", "detail", "pay-123"])).toMatchObject({ status: "CONFIRMED" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["payments", "detail", "pay-123"] });
    view.unmount();
    expect(socketMocks.disconnect).toHaveBeenCalledOnce();
    client.clear();
  });

  it("invalidates the payment query on the polling fallback while disconnected", () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue();
    const view = render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["payments", "detail", "pay-123"] });
    view.unmount();
    client.clear();
  });
});
