"use client";

import ReactQueryProvider from "./ReactQueryProvider";
import { AuthInitializerProvider } from "./authInitializer"; // import the new provider
import { ThemeProvider } from "next-themes";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ReactQueryProvider>
        <AuthInitializerProvider>{children}</AuthInitializerProvider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}

