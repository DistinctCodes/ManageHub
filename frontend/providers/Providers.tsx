"use client";

import ReactQueryProvider from "./ReactQueryProvider";
import { AuthInitializerProvider } from "./authInitializer"; // import the new provider

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <AuthInitializerProvider>{children}</AuthInitializerProvider>
    </ReactQueryProvider>
  );
}
