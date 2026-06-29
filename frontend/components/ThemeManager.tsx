'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/lib/store/themeStore';

export function ThemeManager({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolvedTheme = theme === 'system' ? (isDarkMode ? 'dark' : 'light') : theme;
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [theme]);

  return <>{children}</>;
}