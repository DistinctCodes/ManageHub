"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Bell, User } from "lucide-react";

interface MobileNavProps {
  unreadCount?: number;
}

export default function MobileNav({ unreadCount = 0 }: MobileNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    { label: "Bookings", href: "/bookings", icon: Calendar },
    { label: "Notifications", href: "/notifications", icon: Bell, hasBadge: true },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg px-4 flex items-center justify-around">
      {navItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-colors"
            data-testid={`mobile-nav-${item.label.toLowerCase()}`}
          >
            <div className="relative">
              <Icon
                className={`w-6 h-6 transition-colors duration-200 ${
                  active
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                }`}
                data-testid={`nav-icon-${item.label.toLowerCase()}`}
              />
              {item.hasBadge && unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900"
                  data-testid="unread-badge"
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <span
              className={`mt-1 text-[10px] transition-colors duration-200 ${
                active
                  ? "text-gray-900 dark:text-white font-semibold"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
