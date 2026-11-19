import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreditsPage from "../page";
import { useSessionStore } from "@/lib/stores/session-store";

const mocks = vi.hoisted(() => ({
  accounts: vi.fn(),
  balance: vi.fn(),
  statement: vi.fn(),
}));
vi.mock("@/lib/credits-api", () => ({
  getMyAccounts: mocks.accounts,
  getCreditBalance: mocks.balance,
  getCreditStatement: mocks.statement,
}));
vi.mock("@/lib/stores/use-session-bootstrap", () => ({ useSessionBootstrap: () => {} }));
vi.mock("@/components/auth/user-menu", () => ({ UserMenu: () => null }));
function renderPage() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={client}><CreditsPage /></QueryClientProvider>); }

describe("CreditsPage", () => {
  beforeEach(() => {
    useSessionStore.setState({ user: { id: "u1", email: "a@example.com", role: "user" }, accessToken: "token", status: "authenticated" }, false);
    mocks.accounts.mockReset();
    mocks.balance.mockReset();
    mocks.statement.mockReset();
    mocks.accounts.mockResolvedValue([]);
  });
  afterEach(() => useSessionStore.setState({ user: null, accessToken: null, status: "unknown" }, false));
  it("shows loading indicators", () => { mocks.balance.mockReturnValue(new Promise(() => {})); mocks.statement.mockReturnValue(new Promise(() => {})); renderPage(); expect(screen.getByText("Loading…")).toBeInTheDocument(); });
  it("defers balance and statement queries until accounts load", () => {
    mocks.accounts.mockReturnValue(new Promise(() => {}));
    mocks.balance.mockResolvedValue({ balance: 0, currency: "USD", overdraftLimit: 0 });
    mocks.statement.mockResolvedValue({ entries: [], total: 0, page: 1, pageSize: 20 });
    renderPage();
    expect(mocks.balance).not.toHaveBeenCalled();
    expect(mocks.statement).not.toHaveBeenCalled();
  });
  it("shows statement errors", async () => { mocks.balance.mockResolvedValue({ balance: 0, currency: "USD", overdraftLimit: 0 }); mocks.statement.mockRejectedValue(new Error("Ledger unavailable")); renderPage(); expect(await screen.findByText("Ledger unavailable")).toBeInTheDocument(); });
  it("shows the balance and empty statement state", async () => { mocks.balance.mockResolvedValue({ balance: 2500, currency: "USD", overdraftLimit: 0 }); mocks.statement.mockResolvedValue({ entries: [], total: 0, page: 1, pageSize: 20 }); renderPage(); expect(await screen.findByText("Available balance")).toBeInTheDocument(); expect(await screen.findByText("No transactions yet.")).toBeInTheDocument(); });
  it("switches currency from the user's accounts", async () => {
    const user = userEvent.setup();
    mocks.accounts.mockResolvedValue([
      { id: "a1", currency: "USD", label: null, kind: "USER", balance: 0, overdraftLimit: 0, frozen: false },
      { id: "a2", currency: "EUR", label: null, kind: "USER", balance: 0, overdraftLimit: 0, frozen: false },
    ]);
    mocks.balance.mockResolvedValue({ balance: 100, currency: "EUR", overdraftLimit: 0 });
    mocks.statement.mockResolvedValue({ entries: [], total: 0, page: 1, pageSize: 20 });
    renderPage();
    const selector = await screen.findByLabelText("Currency");
    expect(selector).toHaveValue("USD");
    await user.selectOptions(selector, "EUR");
    expect(await screen.findByText("Available balance")).toBeInTheDocument();
    expect(mocks.balance).toHaveBeenCalledWith("EUR");
    expect(mocks.statement).toHaveBeenCalledWith(1, 20, "EUR");
  });
});
