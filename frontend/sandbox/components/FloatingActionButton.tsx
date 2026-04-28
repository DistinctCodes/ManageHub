"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, LogIn, FileText, MessageCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Action {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const secondaryActions: Action[] = [
    {
      id: "checkin",
      label: "Check In",
      icon: <LogIn className="w-4 h-4" />,
      onClick: () => {
        console.log("Check In clicked");
        setIsOpen(false);
      },
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      id: "invoices",
      label: "View Invoices",
      icon: <FileText className="w-4 h-4" />,
      onClick: () => {
        console.log("View Invoices clicked");
        setIsOpen(false);
      },
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      id: "support",
      label: "Contact Support",
      icon: <MessageCircle className="w-4 h-4" />,
      onClick: () => {
        console.log("Contact Support clicked");
        setIsOpen(false);
      },
      color: "bg-purple-500 hover:bg-purple-600",
    },
  ];

  const handlePrimaryAction = () => {
    router.push("/bookings");
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      <div ref={fabRef} className="relative">
        {/* Secondary Actions */}
        <div className="absolute bottom-16 right-0 space-y-3">
          {secondaryActions.map((action, index) => (
            <div
              key={action.id}
              className={`flex items-center justify-end transition-all duration-300 ease-out ${
                isOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4 pointer-events-none"
              }`}
              style={{
                transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
                transform: isOpen
                  ? `translateY(0) scale(1)`
                  : `translateY(16px) scale(0.8)`,
              }}
            >
              {/* Action Label */}
              <div
                className={`mr-3 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg whitespace-nowrap transition-all duration-300 ${
                  isOpen
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-2"
                }`}
                style={{
                  transitionDelay: isOpen ? `${index * 50 + 100}ms` : "0ms",
                }}
              >
                {action.label}
              </div>
              
              {/* Action Button */}
              <button
                onClick={action.onClick}
                className={`w-12 h-12 rounded-full text-white shadow-lg transition-all duration-300 transform hover:scale-110 ${action.color}`}
                style={{
                  transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
                }}
                aria-label={action.label}
              >
                {action.icon}
              </button>
            </div>
          ))}
        </div>

        {/* Primary FAB Button */}
        <button
          onClick={isOpen ? () => setIsOpen(false) : handlePrimaryAction}
          className={`w-14 h-14 rounded-full text-white shadow-lg transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300 ${
            isOpen
              ? "bg-red-500 hover:bg-red-600 rotate-45"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          aria-label={isOpen ? "Close" : "New Booking"}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </button>

        {/* Ripple Effect */}
        {isOpen && (
          <div className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping" />
        )}
      </div>
    </div>
  );
}
