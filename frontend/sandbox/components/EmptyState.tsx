import Link from "next/link";
import { CalendarX, BellOff, ReceiptText, Building2 } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-xs">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-5 px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function EmptyBookings() {
  return (
    <EmptyState
      icon={<CalendarX className="w-6 h-6" />}
      title="No bookings yet"
      description="You haven't made any bookings. Reserve a workspace to get started."
      action={{ label: "Browse workspaces", href: "/workspaces" }}
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon={<BellOff className="w-6 h-6" />}
      title="All caught up"
      description="You have no notifications right now. Check back later."
    />
  );
}

export function EmptyInvoices() {
  return (
    <EmptyState
      icon={<ReceiptText className="w-6 h-6" />}
      title="No invoices"
      description="Invoices for your bookings will appear here once generated."
    />
  );
}

export function EmptyWorkspaces() {
  return (
    <EmptyState
      icon={<Building2 className="w-6 h-6" />}
      title="No workspaces found"
      description="No workspaces match your search. Try adjusting your filters."
      action={{ label: "Clear filters", href: "/workspaces" }}
    />
  );
}
