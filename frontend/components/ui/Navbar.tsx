"use client"
import { Building2, X, Menu } from "lucide-react";
import { useState } from "react";


type NavItem = { label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
];

/* ---------------- Navbar (reusable) ---------------- */
export function Navbar({ items = NAV_ITEMS }: { items?: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/70 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <span className="bg-[#155dfc] rounded-lg p-3">
                <Building2 className="w-7 h-7" color="#ffffff" />
            </span>
          <span className="font-bold text-gray-800 text-2xl">ManageHub</span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {items.map((it) => (
            <a
              key={it.label}
              href={it.href}
              className="text-md font-semibold text-gray-500 hover:text-gray-900 transition"
            >
              {it.label}
            </a>
          ))}
          <button className="px-4 py-2 rounded-md bg-[#155dfc] text-white font-medium shadow-lg transform hover:scale-[1.02] transition">
            Get Notified
          </button>
        </div>

        <div className="md:hidden">
          <button onClick={() => setOpen((s) => !s)} aria-label="menu">
            {open ? (
              <X className="w-6 h-6 text-gray-900" />
            ) : (
              <Menu className="w-6 h-6 text-gray-900" />
            )}
          </button>
        </div>

        {open && (
          <div className="absolute right-6 top-16 w-48 bg-white/90 backdrop-blur-md rounded-lg p-4 shadow-lg md:hidden">
            {items.map((it) => (
              <a
                key={it.label}
                href={it.href}
                className="block py-2 px-2 text-gray-700 hover:text-gray-900"
              >
                {it.label}
              </a>
            ))}
            <button className="mt-2 w-full px-3 py-2 rounded-md bg-primary text-white">
              Get Notified
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
