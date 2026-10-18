import type { Metadata } from "next";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { Providers } from "@/lib/providers/providers";
import { AdminBreadcrumbs } from "@/components/admin/admin-breadcrumbs";
import { AdminNav } from "@/components/admin/admin-nav";
import { UserMenu } from "@/components/auth/user-menu";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/admin" className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
              <Landmark className="h-5 w-5 text-blue-600" />
              ManageHub Admin
            </Link>
            <div className="flex items-center gap-4">
              <UserMenu />
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Back to site
              </Link>
            </div>
          </div>
        </header>
        <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
          <aside className="w-52 shrink-0">
            <AdminNav />
          </aside>
          <main className="min-w-0 flex-1">
            <AdminBreadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
