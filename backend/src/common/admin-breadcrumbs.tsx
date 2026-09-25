'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Renders a breadcrumb trail for nested admin pages based on the current path.
 * Add to `app/admin/layout.tsx`.
 * Closes #1864
 */
export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const crumbs = segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    href: '/' + segments.slice(0, i + 1).join('/'),
  }));

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden="true" className="text-gray-300">/</span>}
            {isLast ? (
              <span aria-current="page" className="text-gray-900 font-medium">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-indigo-600 transition-colors">{crumb.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
