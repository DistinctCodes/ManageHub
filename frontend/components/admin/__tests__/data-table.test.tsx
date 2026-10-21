import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn, type DataTableSort } from "@/components/admin/data-table";

afterEach(() => {
  cleanup();
});

describe("DataTable", () => {
  const rows = [
    { id: "b", amount: 20, status: "PENDING" },
    { id: "a", amount: 10, status: "SETTLED" },
  ];

  const columns: DataTableColumn<typeof rows[number]>[] = [
    { key: "id", header: "ID" },
    { key: "amount", header: "Amount", sortable: true, render: (row) => `$${row.amount}` },
    { key: "status", header: "Status" },
  ];

  it("sets aria-sort and calls onSort when a sortable header is clicked", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();

    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        sort={{ key: "amount", direction: "asc" }}
        onSort={onSort}
      />,
    );

    const header = screen.getByRole("columnheader", { name: "Amount" });
    expect(header).toHaveAttribute("aria-sort", "ascending");

    await user.click(header);
    expect(onSort).toHaveBeenCalledWith("amount", "desc");
  });

  it("renders the empty state and page controls", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(row) => row.id}
        empty={<div>No rows</div>}
        page={2}
        pageSize={10}
        totalRows={25}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText("No rows")).toBeInTheDocument();
    expect(screen.getByText("Showing 11–20 of 25")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });
});
