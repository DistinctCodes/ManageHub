"use client";

import { ThemeProvider } from 'next-themes';
import ReactQueryProvider from "./ReactQueryProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <ReactQueryProvider>{children}</ReactQueryProvider>
    </ThemeProvider>
  );
}
