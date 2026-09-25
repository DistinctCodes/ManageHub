import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IntegrityResults } from "@/components/admin/integrity-results";

const healthyReport = {
  accountsChecked: 12,
  balanceDrift: [],
  unbalancedTransactions: [],
};

describe("IntegrityResults", () => {
  it("renders an explicit all-clear state for a healthy report", () => {
    render(<IntegrityResults report={healthyReport} />);

    expect(screen.getByRole("status")).toHaveTextContent("No discrepancies found");
    expect(screen.getByText(/All 12 checked accounts reconcile/)).toBeInTheDocument();
    expect(screen.queryByText("Account balance drift")).not.toBeInTheDocument();
    expect(screen.queryByText("Unbalanced transactions")).not.toBeInTheDocument();
  });

  it("keeps diagnostic tables visible when a discrepancy exists", () => {
    render(
      <IntegrityResults
        report={{
          ...healthyReport,
          balanceDrift: [
            { accountId: "account-1", materialized: 100, derived: 90 },
          ],
        }}
      />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Account balance drift")).toBeInTheDocument();
    expect(screen.getByText("Unbalanced transactions")).toBeInTheDocument();
    expect(screen.getByText("account-1")).toBeInTheDocument();
  });
});
