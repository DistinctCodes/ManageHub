import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  SETTLED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  ACTIVE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  AWAITING_CONFIRMATION: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  IN_PROGRESS: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  INITIATED: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  MANUAL_REVIEW: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  PARTIALLY_REFUNDED: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  DISPUTED: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
  FAILED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  EXPIRED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  VOIDED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  REFUNDED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  ABANDONED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}>
      {status}
    </Badge>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50";

export function Button({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
