import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreditsPage from "../page";
import { useSessionStore } from "@/lib/stores/session-store";

const mocks = vi.hoisted(() => ({ balance: vi.fn(), statement: vi.fn() }));
vi.mock("@/lib/credits-api", () => ({ getCreditBalance: mocks.balance, getCreditStatement: mocks.statement }));
vi.mock("@/lib/stores/use-session-bootstrap", () => ({ useSessionBootstrap: () => {} }));
vi.mock("@/components/auth/user-menu", () => ({ UserMenu: () => null }));
function renderPage() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={client}><CreditsPage /></QueryClientProvider>); }

describe("CreditsPage", () => {
  beforeEach(() => { useSessionStore.setState({ user: { id: "u1", email: "a@example.com", role: "user" }, accessToken: "token", status: "authenticated" }, false); mocks.balance.mockReset(); mocks.statement.mockReset(); });
  afterEach(() => useSessionStore.setState({ user: null, accessToken: null, status: "unknown" }, false));
  it("shows loading indicators", () => { mocks.balance.mockReturnValue(new Promise(() => {})); mocks.statement.mockReturnValue(new Promise(() => {})); renderPage(); expect(screen.getByText("Loading…")).toBeInTheDocument(); });
  it("shows statement errors", async () => { mocks.balance.mockResolvedValue({ balance: 0, currency: "USD", overdraftLimit: 0 }); mocks.statement.mockRejectedValue(new Error("Ledger unavailable")); renderPage(); expect(await screen.findByText("Ledger unavailable")).toBeInTheDocument(); });
  it("shows the balance and empty statement state", async () => { mocks.balance.mockResolvedValue({ balance: 2500, currency: "USD", overdraftLimit: 0 }); mocks.statement.mockResolvedValue({ entries: [], total: 0, page: 1, pageSize: 20 }); renderPage(); expect(await screen.findByText("Available balance")).toBeInTheDocument(); expect(await screen.findByText("No transactions yet.")).toBeInTheDocument(); });
});
