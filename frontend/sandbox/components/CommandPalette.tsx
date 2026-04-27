"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  X,
} from "lucide-react";

// ─── Nav items ────────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  keywords?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",  label: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard, keywords: ["home", "overview", "stats"] },
  { id: "workspaces", label: "Workspaces", href: "/workspaces", icon: Building2,        keywords: ["office", "rooms", "space"] },
  { id: "bookings",   label: "Bookings",   href: "/bookings",   icon: CalendarCheck,   keywords: ["calendar", "reserve", "schedule"] },
  { id: "check-in",   label: "Check-in",   href: "/check-in",   icon: Fingerprint,     keywords: ["checkin", "access", "scan"] },
  { id: "invoices",   label: "Invoices",   href: "/invoices",   icon: FileText,        keywords: ["billing", "payment", "receipt"] },
  { id: "settings",   label: "Settings",   href: "/settings",   icon: Settings,        keywords: ["config", "preferences", "account"] },
  { id: "profile",    label: "Profile",    href: "/profile",    icon: User,            keywords: ["me", "avatar", "name"] },
];

// ─── Fuzzy match ──────────────────────────────────────────────────────────────

function fuzzyMatch(query: string, item: NavItem): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const haystack = [item.label, ...(item.keywords ?? [])].join(" ").toLowerCase();
  // Simple subsequence-based fuzzy match
  let i = 0;
  for (const ch of haystack) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CommandPaletteProps {
  /** Controlled open state. When omitted the component manages its own state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const setOpen = useCallback(
    (value: boolean) => {
      if (onOpenChange) onOpenChange(value);
      else setInternalOpen(value);
    },
    [onOpenChange],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, [setOpen]);

  const filtered = NAV_ITEMS.filter((item) => fuzzyMatch(query, item));

  // Reset active index whenever query or open state changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query, isOpen]);

  // ── Keyboard shortcut (Ctrl+K / Cmd+K) ────────────────────────────────────
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && e.key === "k") {
        e.preventDefault();
        setOpen(!isOpen);
      }
    }
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [isOpen, setOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // ── Keyboard navigation inside palette ────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[activeIndex]) navigate(filtered[activeIndex]);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  function navigate(item: NavItem) {
    router.push(item.href);
    close();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!isOpen) return null;

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        aria-hidden="true"
        onClick={close}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          backgroundColor: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          animation: "cp-fade-in 150ms ease",
        }}
      />

      {/* ── Palette panel ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 51,
          width: "min(560px, calc(100vw - 2rem))",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          animation: "cp-slide-in 180ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* ── Search bar ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <Search style={{ width: 18, height: 18, color: "#94a3b8", flexShrink: 0 }} />
          <input
            ref={inputRef}
            id="command-palette-input"
            type="text"
            placeholder="Search pages or actions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#f1f5f9",
              fontSize: "15px",
              lineHeight: "1.4",
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={close}
            aria-label="Close command palette"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: 6,
              background: "rgba(255,255,255,0.06)",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              flexShrink: 0,
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* ── Results list ── */}
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Navigation items"
          style={{
            listStyle: "none",
            margin: 0,
            padding: "6px 8px",
            maxHeight: "340px",
            overflowY: "auto",
          }}
        >
          {filtered.length === 0 ? (
            <li
              style={{
                padding: "28px 0",
                textAlign: "center",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              No results for &ldquo;{query}&rdquo;
            </li>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isActive = idx === activeIndex;
              return (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => navigate(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "background 120ms ease",
                    background: isActive
                      ? "linear-gradient(90deg, rgba(99,102,241,0.28) 0%, rgba(139,92,246,0.15) 100%)"
                      : "transparent",
                    border: isActive ? "1px solid rgba(99,102,241,0.35)" : "1px solid transparent",
                  }}
                >
                  {/* Icon badge */}
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 34,
                      height: 34,
                      borderRadius: "8px",
                      background: isActive
                        ? "rgba(99,102,241,0.35)"
                        : "rgba(255,255,255,0.06)",
                      flexShrink: 0,
                      transition: "background 120ms ease",
                    }}
                  >
                    <Icon
                      style={{
                        width: 16,
                        height: 16,
                        color: isActive ? "#a5b4fc" : "#64748b",
                        transition: "color 120ms ease",
                      }}
                    />
                  </span>

                  {/* Label */}
                  <span
                    style={{
                      flex: 1,
                      fontSize: "14px",
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? "#e0e7ff" : "#94a3b8",
                      transition: "color 120ms ease",
                    }}
                  >
                    {item.label}
                  </span>

                  {/* Enter hint */}
                  {isActive && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                        fontSize: "11px",
                        color: "#6366f1",
                        flexShrink: 0,
                      }}
                    >
                      <CornerDownLeft style={{ width: 12, height: 12 }} />
                      <span>Go</span>
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>

        {/* ── Footer hint ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "16px",
            padding: "8px 16px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            fontSize: "11px",
            color: "#475569",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <ArrowUp style={{ width: 11, height: 11 }} />
            <ArrowDown style={{ width: 11, height: 11 }} />
            Navigate
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <CornerDownLeft style={{ width: 11, height: 11 }} />
            Select
          </span>
          <span>Esc Close</span>
        </div>
      </div>

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes cp-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cp-slide-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1);    }
        }
      `}</style>
    </>
  );
}
