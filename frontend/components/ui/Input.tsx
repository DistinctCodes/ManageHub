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
          <div className='absolute left-3 top-1/2 text-muted-foreground  -translate-y-1/2'>
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-12 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50',
            icon && 'pl-8',
            error &&
              'border-destructive focus:border-destructive focus:ring-destructive/20',
            className
          )}
          ref={ref}
          {...props}
        />

        {error && <p className='text-sm text-destructive'>{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };