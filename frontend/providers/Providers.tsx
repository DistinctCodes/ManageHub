"use client";

import { ThemeProvider } from "next-themes";
import ReactQueryProvider from "./ReactQueryProvider";
import { AuthInitializerProvider } from "./authInitializer"; // import the new provider

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <ReactQueryProvider>
        <AuthInitializerProvider>{children}</AuthInitializerProvider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}
