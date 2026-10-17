"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Coins,
  CreditCard,
  Landmark,
  LayoutDashboard,
  RefreshCw,
  RotateCcw,
  Scale,
  Split,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/accounts", label: "Ledger accounts", icon: Landmark },
  { href: "/admin/credits", label: "Credits & payments", icon: Coins },
  { href: "/admin/integrity", label: "Integrity check", icon: Scale },
  { href: "/admin/splits", label: "Revenue splits", icon: Split },
  { href: "/admin/settlements", label: "Settlement", icon: RefreshCw },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/charge", label: "Charge credits", icon: Zap },
  { href: "/admin/refund", label: "Refunds", icon: RotateCcw },
];

// Detail pages reached from their parent list, not navigated directly.
export const ADMIN_NAV_EXEMPT_ROUTES: string[] = [
  "admin/payments/[id]",
  "admin/settlements/[id]",
  "admin/splits/[id]",
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="sticky top-8 space-y-1">
      {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
              active && "text-blue-600 dark:text-blue-400",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
