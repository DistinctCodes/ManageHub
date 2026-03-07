'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, ...props }, ref) => {
    return (
      <div className='space-y-1 relative'>
        {icon && (
          <div className='absolute left-3 top-1/2 text-gray-500  -translate-y-1/2'>
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-12 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm placeholder:text-gray-500 transition-colors focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 disabled:cursor-not-allowed disabled:opacity-50',
            icon && 'pl-8',
            error &&
              'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          ref={ref}
          {...props}
        />

        {error && <p className='text-sm text-red-600'>{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
