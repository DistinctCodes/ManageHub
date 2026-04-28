"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "info",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Variant button classes
  const variantClasses = useMemo(
    () => ({
      danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white",
      warning: "bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500 text-white",
      info: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white",
    }),
    []
  );

  // Handle escape key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onCancel]);

  // Focus trap
  useEffect(() => {
    if (!open) return;

    // Save currently focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Focus the cancel button by default (safest option)
    setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const first = firstButtonRef.current;
      const last = cancelButtonRef.current;
      const isShiftTab = e.shiftKey;

      if (isShiftTab && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!isShiftTab && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [open]);

  // Restore focus on close
  useEffect(() => {
    if (!open && previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
    }
  }, [open]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel]
  );

  // Handle confirm with loading state
  const handleConfirm = useCallback(async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  }, [onConfirm]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className={cn(
          "relative w-full max-w-md rounded-xl bg-white shadow-2xl",
          "transform transition-all duration-200 ease-out",
          "flex flex-col gap-4 p-6"
        )}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 id="confirm-dialog-title" className="text-xl font-semibold text-gray-900">
          {title}
        </h2>

        {/* Description */}
        <p id="confirm-dialog-description" className="text-gray-600">
          {description}
        </p>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end mt-2">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            ref={firstButtonRef}
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              "w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
              variantClasses[variant]
            )}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
