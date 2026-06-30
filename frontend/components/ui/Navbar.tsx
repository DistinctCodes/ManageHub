'use client';

import { Building2, Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { LocationSwitcher } from './LocationSwitcher';
import { useBranding } from '@/lib/branding/BrandingContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from './ThemeToggle';

type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Resources', href: '/resources' },
];

export function Navbar({
  items = NAV_ITEMS,
}: {
  items?: NavItem[];
}) {
  const [open, setOpen] = useState(false);

  const { user, logout } = useAuthStore();
  const { hubName, logoUrl } = useBranding();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200/40 bg-[#faf9f7]/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={hubName}
              width={36}
              height={36}
              className="rounded-lg object-contain"
            />
          ) : (
            <span className="rounded-lg bg-gray-900 p-2">
              <Building2 className="h-5 w-5 text-white" />
            </span>
          )}
          <span className="text-lg font-semibold tracking-tight text-gray-900">
            {hubName}
          </span>
        </Link>

        {/* FE-35 Location Switcher */}
        <div className="hidden md:block">
          <LocationSwitcher />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm text-gray-500 transition-colors hover:text-gray-900"
            >
              {item.label}
            </Link>
          ))}

          <div className="flex items-center gap-3 border-l border-gray-200/60 pl-6">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    Sign out
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-sm">Theme</span>
                    <ThemeToggle />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-gray-600 transition-colors hover:text-gray-900"
                >
                  Log in
                </Link>

                <Link
                  href="/register"
                  className="rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 transition-colors hover:bg-gray-100 md:hidden"
          aria-label="Toggle menu"
        >
          {open ? (
            <X className="h-5 w-5 text-gray-900" />
          ) : (
            <Menu className="h-5 w-5 text-gray-900" />
          )}
        </button>

        {/* Mobile Menu */}
        {open && (
          <div className="absolute right-6 top-[60px] w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl md:hidden">
            <div className="border-b border-gray-100 p-4">
              <LocationSwitcher />
            </div>

            <div className="p-2">
              {items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="space-y-2 border-t border-gray-100 bg-gray-50 p-3">
              {user ? (
                <>
                  <div className="px-4 py-2 text-sm text-gray-600">
                    {user.name}
                  </div>

                  <button
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                    className="block w-full rounded-lg px-4 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="block w-full rounded-lg px-4 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    Log in
                  </Link>

                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="block w-full rounded-full bg-gray-900 px-4 py-2.5 text-center font-medium text-white transition-colors hover:bg-gray-800"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}