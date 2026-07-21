"use client";

import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Columns, Check } from "lucide-react";

export interface Column<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  onSelectionChange?: (selectedRows: T[]) => void;
}

function compareValues(a: unknown, b: unknown): number {
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onSelectionChange,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<T>>(new Set());
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!colMenuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setColMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [colMenuOpen]);

  const visibleColumns = columns.filter((c) => !hiddenCols.has(c.key));

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey]);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleColumn(key: string) {
    if (visibleColumns.length === 1 && !hiddenCols.has(key)) return;
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleRow(row: T) {
    const next = new Set(selectedRows);
    if (next.has(row)) next.delete(row);
    else next.add(row);
    setSelectedRows(next);
    onSelectionChange?.([...next]);
  }

  function toggleAll() {
    if (selectedRows.size === sortedData.length && sortedData.length > 0) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const next = new Set(sortedData);
      setSelectedRows(next);
      onSelectionChange?.(sortedData);
    }
  }

  const allSelected = selectedRows.size === sortedData.length && sortedData.length > 0;
  const someSelected = selectedRows.size > 0 && !allSelected;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-400">
          {selectedRows.size > 0 ? (
            <span className="text-blue-600 font-medium">
              {selectedRows.size} of {sortedData.length} selected
            </span>
          ) : (
            `${sortedData.length} row${sortedData.length !== 1 ? "s" : ""}`
          )}
        </span>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setColMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Columns className="w-4 h-4" />
            Columns
          </button>

          {colMenuOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-gray-100 bg-white shadow-lg py-1">
              <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Toggle columns
              </p>
              {columns.map((col) => {
                const visible = !hiddenCols.has(col.key);
                const isLast = visible && visibleColumns.length === 1;
                return (
                  <button
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    disabled={isLast}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>{col.label}</span>
                    {visible && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  className="rounded border-gray-300 accent-blue-600 cursor-pointer"
                  aria-label="Select all rows"
                />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 hover:text-gray-900 transition-colors group"
                    >
                      {col.label}
                      <span>
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
                        )}
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-50">
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-4 py-12 text-center text-sm text-gray-400"
                >
                  No data
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => {
                const selected = selectedRows.has(row);
                return (
                  <tr
                    key={idx}
                    className={selected ? "bg-blue-50" : "hover:bg-gray-50 transition-colors"}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleRow(row)}
                        className="rounded border-gray-300 accent-blue-600 cursor-pointer"
                        aria-label={`Select row ${idx + 1}`}
                      />
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {col.render
                          ? col.render(row[col.key], row)
                          : String(row[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
