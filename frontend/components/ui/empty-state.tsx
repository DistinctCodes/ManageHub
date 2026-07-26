import * as React from "react";
import Link from "next/link";
import { AlertCircle, Loader2, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  variant?: "empty" | "error" | "loading";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  variant = "empty",
  className,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (variant === "error") {
      return <AlertCircle className="h-8 w-8 text-rose-500" />;
    }

    if (variant === "loading") {
      return <Loader2 className="h-8 w-8 animate-spin text-gray-400" />;
    }

    if (Icon) {
      return <Icon className="h-8 w-8 text-gray-400" />;
    }

    return <Sparkles className="h-8 w-8 text-gray-400" />;
  };

  const containerStyles = cn(
    "flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm",
    variant === "error" && "border-rose-200 bg-rose-50/40",
    variant === "loading" && "border-gray-200 bg-gray-50/60",
    className
  );

  return (
    <div className={containerStyles}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
        {renderIcon()}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-gray-500">{description}</p>
      ) : null}
      {(actionLabel && (actionHref || onAction)) ? (
        <div className="mt-6">
          {actionHref ? (
            <Button asChild variant="default" size="sm">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button onClick={onAction} variant="default" size="sm">
              {actionLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
