"use client";

import ReactQueryProvider from "./ReactQueryProvider";
import { AuthInitializerProvider } from "./authInitializer";
import { BrandingProvider } from "@/lib/branding/BrandingContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <BrandingProvider>
        <AuthInitializerProvider>{children}</AuthInitializerProvider>
      </BrandingProvider>
    </ReactQueryProvider>
  );
}
