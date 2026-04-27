"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  Fingerprint,
  FileText,
  Settings,
  User,
  Search,
  type LucideIcon,
} from "lucide-react";

// ---- Types ----

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  keywords: string[];
}

// ---- Data ----

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard, keywords: ["home", "overview", "stats"] },
  { label: "Workspaces", href: "/workspaces", icon: Building2,        keywords: ["spaces", "office", "desk", "room"] },
  { label: "Bookings",   href: "/bookings",   icon: CalendarCheck,   keywords: ["reserve", "book", "calendar", "schedule"] },
  { label: "Check-in",   href: "/check-in",   icon: Fingerprint,     keywords: ["checkin", "arrival", "scan"] },
  { label: "Invoices",   href: "/invoices",   icon: FileText,        keywords: ["billing", "payment", "receipt", "invoice"] },
  { label: "Settings",   href: "/settings",   icon: Settings,        keywords: ["preferences", "config", "account"] },
  { label: "Profile",    href: "/profile",    icon: User,            keywords: ["me", "account", "user"] },
];

// ---- Fuzzy match ----
// Every character in the query must appear in order somewhere in the haystack.

function fuzzyMatch(item: NavItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack = [item.label, ...item.keywords].join(" ").toLowerCase();
  let pos = 0;
  for (const ch of q) {
    pos = haystack.indexOf(ch, pos);
    if (pos === -1) return false;
    pos++;
  }
  return true;
}

// ---- Hook: global Ctrl/Cmd+K listener ----

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return { open, setOpen };
}

// ---- Component ----

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = NAV_ITEMS.filter((item) => fuzzyMatch(item, query));

  // Focus input and reset state on open
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIdx(0);
    // defer so the element is visible before focusing
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [open]);

  // Clamp active index when result list shrinks
  useEffect(() => {
    setActiveIdx((i) => (results.length === 0 ? 0 : Math.min(i, results.length - 1)));
  }, [results.length]);

  // Keep active item scrolled into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const navigate = useCallback(
    (item: NavItem) => {
      onClose();
      router.push(item.href);
    },
    [onClose, router]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (results.length === 0) {
      if (e.key === "Escape") onClose();
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + results.length) % results.length);
        break;
      case "Enter":
        navigate(results[activeIdx]);
        break;
      case "Escape":
        onClose();
        break;
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div
        role="dialog"
        aria-modal
        aria-label="Command palette"
        className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-2xl border border-gray-100 bg-white shadow-2xl"
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={onKeyDown}
            placeholder="Go to…"
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-400 font-mono">
            esc
          </kbd>
        </div>

        {/* Results */}
        <ul ref={listRef} className="max-h-72 overflow-y-auto py-2" role="listbox">
          {results.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-gray-400">No results</li>
          ) : (
            results.map((item, idx) => {
              const Icon = item.icon;
              const active = idx === activeIdx;
              return (
                <li
                  key={item.href}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => navigate(item)}
                  className={[
                    "flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors select-none",
                    active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-gray-300" : "text-gray-400"}`} />
                  <span className="font-medium">{item.label}</span>
                  <span className={`ml-auto font-mono text-xs ${active ? "text-gray-400" : "text-gray-300"}`}>
                    {item.href}
                  </span>
                </li>
              );
            })
          )}
        </ul>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-gray-50 px-4 py-2 text-xs text-gray-300 font-mono">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </>
  );
}

// Convenience wrapper that bundles trigger + palette together for the demo
export function CommandPaletteDemo(): ReactNode {
  const { open, setOpen } = useCommandPalette();

  return (
    <>
      <div className="flex flex-col items-center gap-6 py-12">
        <p className="text-sm text-gray-500 text-center max-w-sm">
          Press{" "}
          <kbd className="mx-0.5 rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-xs font-mono">Ctrl+K</kbd>
          {" "}or{" "}
          <kbd className="mx-0.5 rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-xs font-mono">⌘K</kbd>
          {" "}anywhere on the page, or click below.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-400 shadow-sm hover:border-gray-300 hover:text-gray-600 transition-colors w-64 justify-between"
        >
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Go to…
          </span>
          <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-mono">⌘K</kbd>
        </button>
      </div>

      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </>
  );
}
