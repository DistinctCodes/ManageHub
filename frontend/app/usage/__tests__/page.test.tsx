import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UsagePage from "../page";
import { useSessionStore } from "@/lib/stores/session-store";

const mocks = vi.hoisted(() => ({ listMyUsage: vi.fn() }));
vi.mock("@/lib/payments-api", () => ({ listMyUsage: mocks.listMyUsage }));
vi.mock("@/lib/stores/use-session-bootstrap", () => ({ useSessionBootstrap: () => {} }));
vi.mock("@/components/auth/user-menu", () => ({ UserMenu: () => null }));
function renderPage() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={client}><UsagePage /></QueryClientProvider>); }

describe("UsagePage", () => {
  beforeEach(() => { useSessionStore.setState({ user: { id: "u1", email: "a@example.com", role: "user" }, accessToken: "token", status: "authenticated" }, false); mocks.listMyUsage.mockReset(); });
  afterEach(() => useSessionStore.setState({ user: null, accessToken: null, status: "unknown" }, false));
  it("shows loading", () => { mocks.listMyUsage.mockReturnValue(new Promise(() => {})); renderPage(); expect(screen.getByText("Loading…")).toBeInTheDocument(); });
  it("shows API errors", async () => { mocks.listMyUsage.mockRejectedValue(new Error("Usage unavailable")); renderPage(); expect(await screen.findByText("Usage unavailable")).toBeInTheDocument(); });
  it("shows the empty state for a successful empty response", async () => { mocks.listMyUsage.mockResolvedValue([]); renderPage(); expect(await screen.findByText("No usage recorded.")).toBeInTheDocument(); });
});
