"use client";

import { useEffect, useState } from "react";
import type { AdminUser, LedgerAccount } from "@/lib/admin-api";
import { listAccounts, searchUsers } from "@/lib/admin-api";
import { inputClass } from "@/components/admin/ui";

export function userLabel(user: AdminUser): string {
  return user.email;
}

export function accountLabel(account: LedgerAccount): string {
  return account.label?.trim() || account.ownerId || account.id;
}

export function UserPicker({
  label = "User email",
  value,
  selectedLabel,
  onSelect,
}: {
  label?: string;
  value: string;
  selectedLabel: string | null;
  onSelect: (user: AdminUser) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }

    let active = true;
    setSearching(true);
    (typeof searchUsers === "function" ? searchUsers(term) : Promise.resolve([]))
      .then((users) => {
        if (!active) return;
        setResults(users);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setResults([]);
        setError(err instanceof Error ? err.message : "User search failed");
      })
      .finally(() => {
        if (active) setSearching(false);
      });

    return () => {
      active = false;
    };
  }, [query]);

  return (
    <div className="space-y-1">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <input
          className={inputClass}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-label={label}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by email"
        />
      </label>
      {searching ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">Searching…</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {results.length > 0 ? (
        <ul
          role="listbox"
          className="max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
        >
          {results.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                role="option"
                aria-selected={user.id === value}
                className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                onClick={() => {
                  onSelect(user);
                  setResults([]);
                }}
              >
                {userLabel(user)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {`Selected: ${selectedLabel ?? (value || "No user selected")}`}
      </p>
    </div>
  );
}

export function LedgerAccountPicker({
  label = "Ledger account",
  value,
  selectedLabel,
  onSelect,
}: {
  label?: string;
  value: string;
  selectedLabel: string | null;
  onSelect: (account: LedgerAccount) => void;
}) {
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAccounts() {
      const all: LedgerAccount[] = [];
      const seenCursors = new Set<string>();
      let cursor: string | null = null;

      do {
        const page =
          typeof listAccounts === "function"
            ? await listAccounts(undefined, cursor ?? undefined, 200)
            : { data: [], nextCursor: null };
        if (!active) return;
        all.push(...page.data);
        if (!page.nextCursor || seenCursors.has(page.nextCursor)) {
          break;
        }
        seenCursors.add(page.nextCursor);
        cursor = page.nextCursor;
      } while (cursor);

      setAccounts(all);
      setError(null);
    }

    loadAccounts().catch((err: unknown) => {
      if (!active) return;
      setError(err instanceof Error ? err.message : "Account search failed");
    });

    return () => {
      active = false;
    };
  }, []);

  const term = query.trim().toLowerCase();
  const results = dismissed
    ? []
    : accounts.filter((account) =>
        `${accountLabel(account)} ${account.ownerId ?? ""} ${account.currency}`
          .toLowerCase()
          .includes(term),
      );

  return (
    <div className="space-y-1">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <input
          className={inputClass}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-label={label}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setDismissed(false);
          }}
          placeholder="Search by label or owner"
        />
      </label>
      {error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {results.length > 0 ? (
        <ul
          role="listbox"
          className="max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
        >
          {results.map((account) => (
            <li key={account.id}>
              <button
                type="button"
                role="option"
                aria-selected={account.id === value}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                onClick={() => {
                  onSelect(account);
                  setDismissed(true);
                }}
              >
                <span>{accountLabel(account)}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {account.currency}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {`Selected: ${selectedLabel ?? (value || "No account selected")}`}
      </p>
    </div>
  );
}
