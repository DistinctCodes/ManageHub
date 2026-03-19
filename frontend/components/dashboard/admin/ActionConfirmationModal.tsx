"use client";

import { useEffect, useRef, useState } from "react";
import { Member } from "@/lib/types/member";
import {
  MemberAction,
  useMemberMutations,
} from "@/lib/react-query/hooks/useMemberMutations";

interface Props { 
  isOpen: boolean; 
  onClose: () => void; 
  member: Member; 
  action: MemberAction; 
}

export function ActionConfirmationModal({ isOpen, onClose, member, action }: Props) {
  const { mutate, isPending } = useMemberMutations();
  const isMutating = isPending;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const getFocusableElements = () => {
      if (!modalRef.current) return [] as HTMLElement[];
      const selectors =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(modalRef.current.querySelectorAll<HTMLElement>(selectors));
    };

    const focusableElements = getFocusableElements();
    (focusableElements[0] ?? confirmButtonRef.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (activeElement === firstElement || !activeElement) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setErrorMessage(null);
    mutate(
      { memberId: member.id, action }, 
      {
        onSuccess: () => onClose(),
        onError: (error) => {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to update member. Please try again.";
          setErrorMessage(message);
        },
      }
    );
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmHeading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <h3 id="confirmHeading" className="text-lg font-bold text-gray-900 capitalize">
          Confirm {action}
        </h3>
        <p className="text-gray-500 text-sm mt-3 leading-relaxed">
          Are you sure you want to {action.toLowerCase()} <strong>{member.firstName}</strong>? 
          This will take effect immediately.
        </p>
        {errorMessage && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        )}
        <div className="mt-8 flex gap-3">
          <button 
            type="button"
            onClick={onClose} 
            disabled={isMutating || isPending}
            className={`flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl transition-colors ${
              isMutating || isPending ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
            }`}
          >
            Cancel
          </button>
          <button 
            ref={confirmButtonRef}
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-xl disabled:opacity-50 hover:bg-black transition-all"
          >
            {isPending ? "Updating..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}