'use client';

import { useSession } from 'next-auth/react';

/**
 * Displays the currently logged-in admin's name and email in the header.
 * Intended for use inside `app/admin/layout.tsx`.
 * Closes #1863
 */
export function AdminIdentity() {
  const { data: session } = useSession();
  const admin = session?.user;

  if (!admin) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white">
      <div
        className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-semibold"
        aria-hidden="true"
      >
        {admin.name?.charAt(0).toUpperCase() ?? 'A'}
      </div>
      <div className="leading-tight">
        <p className="text-sm font-medium text-gray-900">{admin.name ?? 'Admin'}</p>
        <p className="text-xs text-gray-500">{admin.email}</p>
      </div>
    </div>
  );
}
