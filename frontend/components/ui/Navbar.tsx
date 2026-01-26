"use client";
import { Building2, X, Menu } from "lucide-react";
import Link from "next/link";
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
    <header className="fixed inset-x-0 top-0 z-50 bg-[#f8fafc]/95 backdrop-blur-md border-b border-gray-200/50">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-[#2563EB] rounded-lg p-2.5">
            <Building2 className="w-6 h-6" color="#ffffff" />
          </span>
          <span className="font-bold text-gray-900 text-xl">ManageHub</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {items.map((it) => (
            <Link
              key={it.label}
              href={it.href}
              className="text-sm font-medium text-gray-600 hover:text-[#2563EB] transition-colors"
            >
              {it.label}
            </Link>
          ))}

          <Link
            href="#notify"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#2563EB] transition-colors"
          >
            Get Notified
          </Link>

          {/* Auth Buttons - Desktop */}
          <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#2563EB] transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-lg bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 transition-all shadow-sm"
            >
              Sign Up
            </Link>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpen((s) => !s)}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {open ? (
            <X className="w-6 h-6 text-gray-900" />
          ) : (
            <Menu className="w-6 h-6 text-gray-900" />
          )}
        </button>

        {/* Mobile Menu Dropdown */}
        {open && (
          <div className="absolute right-6 top-[72px] w-56 bg-white rounded-xl shadow-xl border border-gray-200 md:hidden overflow-hidden">
            <div className="p-2">
              {items.map((it) => (
                <Link
                  key={it.label}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 px-4 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                >
                  {it.label}
                </Link>
              ))}

              <Link
                href="#notify"
                onClick={() => setOpen(false)}
                className="block py-2.5 px-4 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                Get Notified
              </Link>
            </div>

            {/* Auth Buttons - Mobile */}
            <div className="border-t border-gray-100 p-3 space-y-2 bg-gray-50">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block w-full px-4 py-2.5 text-center rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="block w-full px-4 py-2.5 text-center rounded-lg bg-[#2563EB] text-white font-medium hover:bg-[#1d4ed8] transition-colors shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
