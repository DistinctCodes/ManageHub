"use client";

import Link from "next/link";
import { CalendarPlus, UserPlus, BarChart3, Settings } from "lucide-react";

const actions = [
  {
    label: "Book a desk",
    icon: CalendarPlus,
    href: "/dashboard",
    desc: "Reserve workspace",
  },
  {
    label: "Invite member",
    icon: UserPlus,
    href: "/dashboard",
    desc: "Send an invite link",
  },
  {
    label: "View reports",
    icon: BarChart3,
    href: "/dashboard",
    desc: "Analytics & insights",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
    desc: "Manage your account",
  },
];

export default function QuickActions() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Quick actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <span className="w-9 h-9 rounded-lg bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center transition-colors">
              <a.icon className="w-4 h-4 text-gray-500" />
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">{a.label}</p>
              <p className="text-xs text-gray-400">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
