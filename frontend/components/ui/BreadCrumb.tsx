import { ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

interface LinkItem {
  label: string;
  href?: string;
}

interface LinkList {
  links: LinkItem[];
}

const BreadCrumb = ({ links }: LinkList) => {
  return (
    <nav className='flex' aria-label='Breadcrumb'>
      <ul className=' flex items-center gap-2'>
        {links.map((link) => (
          <li
            key={link.href}
            className='text-sm font-medium flex items-center gap-2'
          >
            {link.href ? (
              <>
                <Link href={link.href}>{link.label}</Link>
                <ChevronRightIcon size={13} />
              </>
            ) : (
              <span className='block px-2 py-0.5 rounded-sm bg-gray-200'>
                {link.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default BreadCrumb;
