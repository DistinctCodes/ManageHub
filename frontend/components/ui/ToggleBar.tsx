'use client';

import { cn } from '@/utils/cn';

interface ToggleBarProps {
  options: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
  }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ToggleBar({ options, value, onChange, className }: ToggleBarProps) {
  return (
    <div
      className={cn('flex rounded-lg bg-muted p-1', className)}
      role="tablist"
      aria-label="Login method selection"
    >
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          role="tab"
          aria-selected={value === option.id}
          aria-controls={`${option.id}-panel`}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
            value === option.id
              ? 'bg-primary text-primary-foreground shadow-sm focus:ring-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 focus:ring-ring'
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}