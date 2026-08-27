import type { Metadata } from "next";
import Link from "next/link";
import {
  Landmark,
  Scale,
  Split,
  RefreshCw,
  LayoutDashboard,
} from "lucide-react";
import { AdminProviders } from "@/lib/providers";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin",
};

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/accounts", label: "Ledger accounts", icon: Landmark },
  { href: "/admin/integrity", label: "Integrity check", icon: Scale },
  { href: "/admin/splits", label: "Revenue splits", icon: Split },
  { href: "/admin/settlements", label: "Settlement", icon: RefreshCw },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProviders>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/admin" className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
              <Landmark className="h-5 w-5 text-blue-600" />
              ManageHub Admin
            </Link>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              Back to site
            </Link>
          </div>
        </header>
        <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
          <aside className="w-52 shrink-0">
            <nav className="sticky top-8 space-y-1">
              {nav.map(({ href, label, icon: Icon }) => (
                <AdminLink key={href} href={href} icon={Icon}>
                  {label}
                </AdminLink>
              ))}
            </nav>
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </AdminProviders>
  );
}

function AdminLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}
