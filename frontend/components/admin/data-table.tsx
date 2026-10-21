import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type DataTableSortDirection = "asc" | "desc";

export type DataTableSort = {
  key: string;
  direction: DataTableSortDirection;
};

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render?: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort?: DataTableSort;
  onSort?: (key: string, direction: DataTableSortDirection) => void;
  loading?: boolean;
  empty?: ReactNode;
  error?: ReactNode;
  page?: number;
  pageSize?: number;
  totalRows?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  loading,
  empty,
  error,
  page,
  pageSize,
  totalRows,
  onPageChange,
  onRowClick,
  rowActions,
  className,
}: DataTableProps<T>) {
  const hasPagination =
    typeof page === "number" &&
    typeof pageSize === "number" &&
    typeof totalRows === "number" &&
    totalRows >= 0;

  const startRow = hasPagination ? Math.min((page - 1) * pageSize + 1, totalRows) : 1;
  const endRow = hasPagination ? Math.min(page * pageSize, totalRows) : rows.length;

  const handleSort = (key: string) => {
    if (!onSort) {
      return;
    }
    const nextDirection =
      sort?.key === key && sort.direction === "asc" ? "desc" : "asc";
    onSort(key, nextDirection);
  };

  const paginationVisible = hasPagination && totalRows > 0;

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <tr>
            {columns.map((column) => {
              const isSorted = sort?.key === column.key;
              const ariaSort = isSorted
                ? sort.direction === "asc"
                  ? "ascending"
                  : "descending"
                : "none";

              return (
                <th
                  key={String(column.key)}
                  scope="col"
                  className={cn(
                    "px-5 py-3 align-middle",
                    column.headerClassName,
                    column.className,
                    column.sortable && "cursor-pointer select-none",
                  )}
                  aria-sort={column.sortable ? ariaSort : undefined}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  {column.header}
                </th>
              );
            })}
            {rowActions ? <th scope="col" className="px-5 py-3 text-right" /> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <tr key={`loading-${index}`}>
                {columns.map((column) => (
                  <td key={`${column.key}-loading`} className="px-5 py-3">
                    <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                ))}
                {rowActions ? <td className="px-5 py-3" /> : null}
              </tr>
            ))
          ) : null}

          {!loading && error ? (
            <tr>
              <td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-5 py-6">
                {error}
              </td>
            </tr>
          ) : null}

          {!loading && !error && rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (rowActions ? 1 : 0)}
                className="px-5 py-8 text-center text-gray-400"
              >
                {empty ?? "No rows found."}
              </td>
            </tr>
          ) : null}

          {!loading && !error && rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn(
                "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                onRowClick ? "cursor-pointer" : undefined,
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => {
                const value =
                  column.render ?
                    column.render(row) :
                    (row as Record<string, unknown>)[String(column.key)] as ReactNode;

                return (
                  <td
                    key={`${rowKey(row)}-${String(column.key)}`}
                    className={cn("px-5 py-3 align-middle", column.className)}
                  >
                    {value}
                  </td>
                );
              })}
              {rowActions ? (
                <td className="px-5 py-3 text-right align-middle">{rowActions(row)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      {paginationVisible ? (
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 text-sm dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">
            Showing {startRow}–{endRow} of {totalRows}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange?.(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded-md border border-gray-200 px-3 py-1 font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onPageChange?.(page + 1)}
              disabled={endRow >= totalRows}
              className="rounded-md border border-gray-200 px-3 py-1 font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
