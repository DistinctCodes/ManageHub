// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "@/providers/ReactQueryProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ManageHub - Smart Workspace Management",
  description:
    "Streamline workspace management with biometric check-ins, blockchain payments, and real-time analytics.",
  keywords: "workspace management, coworking, biometric, blockchain, Nigeria",
  authors: [{ name: "ManageHub" }],
  openGraph: {
    title: "ManageHub - Smart Workspace Management",
    description:
      "Streamline workspace management with biometric check-ins, blockchain payments, and real-time analytics.",
    type: "website",
    locale: "en_NG",
    siteName: "ManageHub",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  );
}
