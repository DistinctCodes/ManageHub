import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: {
    listAccounts: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    listSplits: vi.fn(),
    createSplit: vi.fn(),
    setSplitActive: vi.fn(),
    previewSplit: vi.fn(),
    listBatches: vi.fn(),
    runSettlement: vi.fn(),
    getBatchBreakdown: vi.fn(),
    executeBatch: vi.fn(),
    retryBatch: vi.fn(),
    abandonBatch: vi.fn(),
  },
  payments: {
    chargeCredits: vi.fn(),
    listManualReviewPayments: vi.fn(),
    requestRefund: vi.fn(),
    getPayment: vi.fn(),
    forceReconcilePayment: vi.fn(),
    resolvePaymentManually: vi.fn(),
    voidPayment: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
  routeId: "payment-1",
}));

vi.mock("@/lib/admin-api", () => mocks.admin);
vi.mock("@/lib/payments-api", () => mocks.payments);
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/components/admin/require-admin", () => ({
  RequireAdmin: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/admin/settlement-volume-chart", () => ({
  SettlementVolumeChart: () => <div data-testid="settlement-chart" />,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: mocks.routeId }),
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("next/dynamic", async () => {
  const ReactModule = await import("react");
  return {
    default: (loader: () => Promise<{ default: React.ComponentType }>, options?: { loading?: () => React.ReactNode }) =>
      function DynamicComponent(props: Record<string, unknown>) {
        const [Resolved, setResolved] = ReactModule.useState<React.ComponentType | null>(null);
        ReactModule.useEffect(() => {
          let mounted = true;
          loader().then((module) => {
            if (mounted) setResolved(() => module.default);
          });
          return () => { mounted = false; };
        }, []);
        return Resolved
          ? ReactModule.createElement(Resolved, props)
          : options?.loading?.() ?? null;
      },
  };
});

import AccountsPage from "@/app/admin/accounts/page";
import ChargePage from "@/app/admin/charge/page";
import CreditsPage from "@/app/admin/credits/page";
import PaymentsPage from "@/app/admin/payments/page";
import PaymentDetailPage from "@/app/admin/payments/[id]/page";
import RefundPage from "@/app/admin/refund/page";
import SettlementsPage from "@/app/admin/settlements/page";
import BatchDetailPage from "@/app/admin/settlements/[id]/page";
import SplitsPage from "@/app/admin/splits/page";
import SplitDetailPage from "@/app/admin/splits/[id]/page";

function renderPage(page: React.ReactNode) {
  cleanup();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: "account-1",
    kind: "USER",
    ownerId: "member-1",
    currency: "USD",
    balance: 1250,
    overdraftLimit: 0,
    externalPayoutAddress: null,
    frozen: false,
    label: "Member account",
    ...overrides,
  };
}

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    bookingId: "booking-1",
    userId: "member-1",
    amount: 2500,
    currency: "USD",
    rail: "FIAT",
    status: "MANUAL_REVIEW",
    provider: "test-provider",
    providerReference: "provider-1",
    expiresAt: null,
    failureReason: null,
    reconciliationAttempts: 1,
    manualReviewReason: "Provider timeout",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function split(overrides: Record<string, unknown> = {}) {
  return {
    id: "split-1",
    name: "Default split",
    description: "Standard revenue allocation",
    active: true,
    totalBasisPoints: 10000,
    createdAt: "2025-01-01T00:00:00.000Z",
    recipients: [
      {
        id: "recipient-1",
        label: "Operations",
        basisPoints: 10000,
        accountId: "account-1",
        externalAddress: null,
        sortOrder: 0,
      },
    ],
    ...overrides,
  };
}

function batch(overrides: Record<string, unknown> = {}) {
  return {
    id: "batch-1",
    status: "FAILED",
    currency: "USD",
    mode: "DISTRIBUTION",
    splitConfigId: "split-1",
    periodEnd: "2025-01-01T00:00:00.000Z",
    totalAmount: 9000,
    claimedEntryCount: 2,
    notes: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function batchBreakdown() {
  return {
    batch: batch(),
    payouts: [
      {
        id: "payout-1",
        label: "Operations",
        accountId: "account-1",
        externalAddress: null,
        basisPoints: 10000,
        amount: 9000,
        currency: "USD",
        status: "FAILED",
        idempotencyKey: "batch-1:payout-1",
        onChainReference: null,
        ledgerTransactionId: null,
        attempts: 2,
        lastError: "Gateway timeout",
        confirmedAt: null,
      },
    ],
    entries: [
      {
        id: "entry-1",
        transactionId: "txn-1",
        accountId: "account-1",
        direction: "CREDIT",
        amount: 9000,
        currency: "USD",
        settlementBatchId: "batch-1",
        settledAt: null,
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ],
    onChainReferences: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.routeId = "payment-1";
  mocks.admin.listAccounts.mockResolvedValue([]);
  mocks.admin.createAccount.mockResolvedValue(account());
  mocks.admin.updateAccount.mockResolvedValue(account({ frozen: true }));
  mocks.admin.listSplits.mockResolvedValue([]);
  mocks.admin.createSplit.mockResolvedValue(split());
  mocks.admin.setSplitActive.mockResolvedValue(split({ active: false }));
  mocks.admin.previewSplit.mockResolvedValue({ amount: 10000, allocatedTotal: 10000, shares: [] });
  mocks.admin.listBatches.mockResolvedValue([]);
  mocks.admin.runSettlement.mockResolvedValue({});
  mocks.admin.getBatchBreakdown.mockResolvedValue(batchBreakdown());
  mocks.admin.executeBatch.mockResolvedValue(batch());
  mocks.admin.retryBatch.mockResolvedValue(batch({ status: "IN_PROGRESS" }));
  mocks.admin.abandonBatch.mockResolvedValue(batch({ status: "ABANDONED" }));
  mocks.payments.chargeCredits.mockResolvedValue({
    transaction: { id: "txn-1", kind: "CHARGE", reference: "ref-1", currency: "USD", amount: 500, description: null, createdAt: "2025-01-01T00:00:00.000Z" },
    posted: true,
    balanceAfter: 500,
    currency: "USD",
  });
  mocks.payments.listManualReviewPayments.mockResolvedValue({ items: [], total: 0 });
  mocks.payments.requestRefund.mockResolvedValue({ payment: payment(), refund: { id: "refund-1" } });
  mocks.payments.getPayment.mockResolvedValue(payment());
  mocks.payments.forceReconcilePayment.mockResolvedValue(payment());
  mocks.payments.resolvePaymentManually.mockResolvedValue(payment());
  mocks.payments.voidPayment.mockResolvedValue(payment({ status: "VOIDED" }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin charge page", () => {
  it("requires charge fields and shows a confirmation before posting", async () => {
    const user = userEvent.setup();
    renderPage(<ChargePage />);
    await user.click(screen.getByRole("button", { name: "Charge credits" }));
    expect(mocks.payments.chargeCredits).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("User ID"), "member-1");
    await user.type(screen.getByLabelText("Amount (minor units)"), "500");
    await user.type(screen.getByLabelText("Reference (idempotency key)"), "ref-1");
    await user.type(screen.getByLabelText("Reason"), "Manual correction");
    await user.click(screen.getByRole("button", { name: "Charge credits" }));

    expect(screen.getByRole("dialog", { name: "Confirm charge" })).toBeInTheDocument();
    expect(mocks.payments.chargeCredits).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm charge" }));
    expect(await screen.findByText(/Transaction txn-1/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Confirm charge" })).not.toBeInTheDocument();
    expect(mocks.payments.chargeCredits).toHaveBeenCalledWith({
      userId: "member-1", amount: 500, currency: undefined, reference: "ref-1", reason: "Manual correction",
    });
  });

  it("reports charge errors after confirmation", async () => {
    mocks.payments.chargeCredits.mockRejectedValueOnce(new Error("Charge rejected"));
    const user = userEvent.setup();
    renderPage(<ChargePage />);
    await user.type(screen.getByLabelText("User ID"), "member-1");
    await user.type(screen.getByLabelText("Amount (minor units)"), "500");
    await user.type(screen.getByLabelText("Reference (idempotency key)"), "ref-1");
    await user.type(screen.getByLabelText("Reason"), "Manual correction");
    await user.click(screen.getByRole("button", { name: "Charge credits" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm charge" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Charge rejected"));
  });
});

describe("admin refund page", () => {
  it("shows an error when the manual-review list fails", async () => {
    mocks.payments.listManualReviewPayments.mockRejectedValueOnce(new Error("Payments unavailable"));
    renderPage(<RefundPage />);
    expect(await screen.findByText("Payments unavailable")).toBeInTheDocument();
  });

  it("renders the empty queue state", async () => {
    renderPage(<RefundPage />);
    expect(await screen.findByText("No payments found in manual review.")).toBeInTheDocument();
  });

  it("limits refunds to the payment amount and requires a reason", async () => {
    const user = userEvent.setup();
    mocks.payments.listManualReviewPayments.mockResolvedValueOnce({ items: [payment()], total: 1 });
    renderPage(<RefundPage />);

    const amount = await screen.findByLabelText("Refund amount");
    const reason = screen.getByLabelText("Reason");
    expect(amount).toHaveAttribute("min", "1");
    expect(amount).toHaveAttribute("max", "2500");
    expect(reason).toBeRequired();
    await user.clear(amount);
    await user.type(amount, "2600");
    await user.type(reason, "Requested by member");
    await user.click(screen.getByRole("button", { name: "Refund" }));
    expect(mocks.payments.requestRefund).not.toHaveBeenCalled();

    await user.clear(amount);
    await user.type(amount, "1200");
    await user.clear(reason);
    await user.click(screen.getByRole("button", { name: "Refund" }));
    expect(mocks.payments.requestRefund).not.toHaveBeenCalled();
    await user.type(reason, "Requested by member");
    await user.click(screen.getByRole("button", { name: "Refund" }));
    expect(mocks.payments.requestRefund).toHaveBeenCalledWith("payment-1", 1200, "Requested by member");
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith("Refund request submitted"));
  });

  it("reports a failed refund request", async () => {
    const user = userEvent.setup();
    mocks.payments.listManualReviewPayments.mockResolvedValueOnce({ items: [payment()], total: 1 });
    mocks.payments.requestRefund.mockRejectedValueOnce(new Error("Refund rejected"));
    renderPage(<RefundPage />);
    await user.type(await screen.findByLabelText("Reason"), "Duplicate charge");
    await user.click(screen.getByRole("button", { name: "Refund" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Refund rejected"));
  });
});

describe("admin accounts page", () => {
  it("lists accounts and freezes an account", async () => {
    const user = userEvent.setup();
    mocks.admin.listAccounts.mockResolvedValueOnce([account()]);
    renderPage(<AccountsPage />);
    expect(await screen.findByText("member-1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Freeze" }));
    expect(mocks.admin.updateAccount).toHaveBeenCalledWith("account-1", { frozen: true });
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith("Account policy updated"));
  });

  it("shows a list error and can create an account", async () => {
    mocks.admin.listAccounts.mockRejectedValueOnce(new Error("Accounts unavailable"));
    renderPage(<AccountsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Accounts unavailable");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "New account" }));
    await user.type(screen.getByLabelText("Label"), "Reserve");
    await user.click(screen.getByRole("button", { name: /^Create$/ }));
    await waitFor(() => expect(mocks.admin.createAccount).toHaveBeenCalledWith(expect.objectContaining({ label: "Reserve" })));
    expect(mocks.toast.success).toHaveBeenCalledWith("Account created");
  });

  it("surfaces account creation failures", async () => {
    mocks.admin.createAccount.mockRejectedValueOnce(new Error("Account rejected"));
    const user = userEvent.setup();
    renderPage(<AccountsPage />);
    await user.click(screen.getByRole("button", { name: "New account" }));
    await user.type(screen.getByLabelText("Label"), "Reserve");
    await user.click(screen.getByRole("button", { name: /^Create$/ }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Account rejected"));
  });
});

describe("admin payment pages", () => {
  it("renders the manual-review payment list and an empty result", async () => {
    mocks.payments.listManualReviewPayments.mockResolvedValueOnce({ items: [payment()], total: 1 });
    renderPage(<PaymentsPage />);
    expect(await screen.findByText("Manual-review queue")).toBeInTheDocument();
    expect(await screen.findByText(/payment-/)).toBeInTheDocument();

    mocks.payments.listManualReviewPayments.mockResolvedValueOnce({ items: [], total: 0 });
    renderPage(<PaymentsPage />);
    expect(await screen.findByText("No payments in the manual-review queue.")).toBeInTheDocument();
  });

  it("shows list errors and payment details", async () => {
    mocks.payments.listManualReviewPayments.mockRejectedValueOnce(new Error("Queue failed"));
    renderPage(<PaymentsPage />);
    expect(await screen.findByText("Queue failed")).toBeInTheDocument();

    renderPage(<PaymentDetailPage />);
    expect(await screen.findByText("Payment detail")).toBeInTheDocument();
    expect(screen.getByText("member-1")).toBeInTheDocument();
  });

  it("shows payment lookup errors and requires a reason before voiding", async () => {
    mocks.routeId = "payment-1";
    mocks.payments.getPayment.mockRejectedValueOnce(new Error("Payment unavailable"));
    renderPage(<PaymentDetailPage />);
    expect(await screen.findByText("Payment unavailable")).toBeInTheDocument();

    mocks.payments.getPayment.mockResolvedValueOnce(payment());
    const user = userEvent.setup();
    renderPage(<PaymentDetailPage />);
    await user.click(await screen.findByRole("button", { name: "Void payment" }));
    const confirm = within(screen.getByRole("dialog")).getByRole("button", { name: "Void payment" });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByPlaceholderText(/Enter reason/), "Duplicate payment");
    await user.click(confirm);
    await waitFor(() => expect(mocks.payments.voidPayment).toHaveBeenCalledWith("payment-1", "Duplicate payment"));
  });
});

describe("admin credits page", () => {
  it("loads the management forms and reports API failures", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPage(<CreditsPage />);
    expect(await screen.findByText("Manual Credit Adjustment")).toBeInTheDocument();
    await user.type(screen.getAllByRole("textbox")[0], "member-1");
    await user.type(screen.getAllByRole("spinbutton")[0], "5");
    await user.type(screen.getAllByRole("textbox")[1], "Correction");
    await user.click(screen.getByRole("button", { name: "Apply Adjustment" }));
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith("Manual credit adjustment applied successfully."));
    await user.type(screen.getAllByRole("textbox")[2], "payment-1");
    await user.type(screen.getAllByRole("spinbutton")[1], "5");
    await user.click(screen.getByRole("button", { name: "Trigger Top-Up" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Failed to trigger payment top-up."));
  });
});

describe("admin revenue splits pages", () => {
  it("renders the split list, reports errors, and enforces a 10000 basis-point total", async () => {
    const user = userEvent.setup();
    mocks.admin.listSplits.mockResolvedValueOnce([split()]);
    renderPage(<SplitsPage />);
    expect(await screen.findByText("Default split")).toBeInTheDocument();

    mocks.admin.listSplits.mockRejectedValueOnce(new Error("Splits unavailable"));
    renderPage(<SplitsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Splits unavailable");

    mocks.admin.listSplits.mockResolvedValueOnce([]);
    renderPage(<SplitsPage />);
    await user.click(await screen.findByRole("button", { name: "New split" }));
    await user.type(screen.getByLabelText("Name"), "New config");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.type(screen.getByPlaceholderText("Label"), "Operations");
    const bps = screen.getByPlaceholderText("Basis points");
    await user.type(bps, "6000");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.type(screen.getAllByPlaceholderText("Label")[1], "Reserve");
    await user.type(screen.getAllByPlaceholderText("Basis points")[1], "3000");
    expect(screen.getByText(/Total: 9000 basis points/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Create$/ })).toBeDisabled();
    await user.clear(screen.getAllByPlaceholderText("Basis points")[1]);
    await user.type(screen.getAllByPlaceholderText("Basis points")[1], "4000");
    expect(screen.getByText(/Total: 10000 basis points/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Create$/ }));
    await waitFor(() => expect(mocks.admin.createSplit).toHaveBeenCalledWith(expect.objectContaining({ name: "New config" })));
  });

  it("renders split details, previews allocations, and handles lookup errors", async () => {
    mocks.routeId = "split-1";
    const user = userEvent.setup();
    mocks.admin.listSplits.mockResolvedValueOnce([split()]);
    renderPage(<SplitDetailPage />);
    expect(await screen.findByText("Default split")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Preview" }));
    expect(mocks.admin.previewSplit).toHaveBeenCalledWith("split-1", 10000);
    await user.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(mocks.admin.setSplitActive).toHaveBeenCalledWith("split-1", false);

    mocks.admin.listSplits.mockRejectedValueOnce(new Error("Split detail failed"));
    renderPage(<SplitDetailPage />);
    expect(await screen.findByText("Split detail failed")).toBeInTheDocument();
  });

  it("reports create failures", async () => {
    mocks.admin.listSplits.mockResolvedValueOnce([]);
    mocks.admin.createSplit.mockRejectedValueOnce(new Error("Invalid split"));
    const user = userEvent.setup();
    renderPage(<SplitsPage />);
    await user.click(await screen.findByRole("button", { name: "New split" }));
    await user.type(screen.getByLabelText("Name"), "New config");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.type(screen.getByPlaceholderText("Label"), "Operations");
    await user.type(screen.getByPlaceholderText("Basis points"), "10000");
    await user.click(screen.getByRole("button", { name: /^Create$/ }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Invalid split"));
  });
});

describe("admin settlements pages", () => {
  it("lists settlement batches, runs a settlement, and renders empty results", async () => {
    const user = userEvent.setup();
    mocks.admin.listBatches.mockResolvedValueOnce([batch()]);
    renderPage(<SettlementsPage />);
    expect(await screen.findByText("Settlement pipeline")).toBeInTheDocument();
    expect(await screen.findByText("9,000")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Run settlement now" }));
    await waitFor(() => expect(mocks.admin.runSettlement).toHaveBeenCalled());

    mocks.admin.listBatches.mockResolvedValueOnce([]);
    renderPage(<SettlementsPage />);
    expect(await screen.findByText("No settlement batches.")).toBeInTheDocument();
  });

  it("shows settlement list errors and run failures", async () => {
    mocks.admin.listBatches.mockRejectedValueOnce(new Error("Settlement list failed"));
    mocks.admin.runSettlement.mockRejectedValueOnce(new Error("Run failed"));
    const user = userEvent.setup();
    renderPage(<SettlementsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Settlement list failed");
    await user.click(screen.getByRole("button", { name: "Run settlement now" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Run failed"));
  });

  it("retries and abandons a batch with a required reason", async () => {
    mocks.routeId = "batch-1";
    const user = userEvent.setup();
    renderPage(<BatchDetailPage />);
    expect(await screen.findByText("Batch breakdown")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry failed" }));
    await waitFor(() => expect(mocks.admin.retryBatch).toHaveBeenCalledWith("batch-1"));
    const reason = screen.getByLabelText("Reason (required)");
    expect(reason).toBeRequired();
    await user.click(screen.getByRole("button", { name: "Abandon" }));
    expect(mocks.admin.abandonBatch).not.toHaveBeenCalled();
    await user.type(reason, "No longer payable");
    await user.click(screen.getByRole("button", { name: "Abandon" }));
    await waitFor(() => expect(mocks.admin.abandonBatch).toHaveBeenCalledWith("batch-1", "No longer payable"));
  });

  it("shows batch lookup and retry errors", async () => {
    mocks.routeId = "batch-1";
    mocks.admin.getBatchBreakdown.mockRejectedValueOnce(new Error("Batch unavailable"));
    renderPage(<BatchDetailPage />);
    expect(await screen.findByText("Batch unavailable")).toBeInTheDocument();

    mocks.admin.getBatchBreakdown.mockResolvedValueOnce(batchBreakdown());
    mocks.admin.retryBatch.mockRejectedValueOnce(new Error("Retry failed"));
    const user = userEvent.setup();
    renderPage(<BatchDetailPage />);
    await user.click(await screen.findByRole("button", { name: "Retry failed" }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Retry failed"));
  });
});
