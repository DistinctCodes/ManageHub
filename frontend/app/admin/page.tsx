import Link from "next/link";
import { Landmark, Scale, Split, RefreshCw, ClipboardList } from "lucide-react";
import { Card } from "@/components/admin/ui";

const cards = [
  {
    href: "/admin/accounts",
    title: "Ledger accounts",
    description:
      "Browse and manage credit-ledger accounts — balances, policy, freezing, payout addresses.",
    icon: Landmark,
  },
  {
    href: "/admin/integrity",
    title: "Integrity check",
    description:
      "Re-derive balances from the append-only entries and surface balance drift or unbalanced transactions.",
    icon: Scale,
  },
  {
    href: "/admin/splits",
    title: "Revenue splits",
    description:
      "Create and manage revenue-split configs, inspect recipients, and preview allocations.",
    icon: Split,
  },
  {
    href: "/admin/settlements",
    title: "Settlement pipeline",
    description:
      "Inspect settlement batches, view breakdowns, and drive execute / retry / abandon recovery.",
    icon: RefreshCw,
  },
  {
    href: "/admin/payments",
    title: "Manual-review queue",
    description:
      "Payments escalated to MANUAL_REVIEW — force-reconcile, resolve, or void them from the browser.",
    icon: ClipboardList,
  },
];

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
        Admin dashboard
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        The ADMIN surface for the credit ledger, revenue splits, and the
        settlement pipeline.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full p-5 transition hover:border-blue-400 hover:shadow-md dark:hover:border-blue-600">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900 group-hover:text-blue-700 dark:text-gray-50">
                  {title}
                </h2>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
