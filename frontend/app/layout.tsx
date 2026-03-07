import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/providers/Providers";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ManageHub - Smart Hub & Workspace Management",
    template: "%s | ManageHub",
  },
  description:
    "Smart Hub & Workspace Management System for modern teams. Streamline operations, manage resources, and boost productivity with our comprehensive management platform.",
  keywords: [
    "workspace management",
    "hub management",
    "team productivity",
    "resource management",
    "smart workspace",
    "collaboration tools",
    "project management",
  ],
  authors: [{ name: "ManageHub Team" }],
  creator: "ManageHub",
  publisher: "ManageHub",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://managehub.app",
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "ManageHub - Smart Hub & Workspace Management",
    description:
      "Smart Hub & Workspace Management System for modern teams. Streamline operations, manage resources, and boost productivity with our comprehensive management platform.",
    siteName: "ManageHub",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ManageHub - Smart Hub & Workspace Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ManageHub - Smart Hub & Workspace Management",
    description:
      "Smart Hub & Workspace Management System for modern teams. Streamline operations, manage resources, and boost productivity.",
    images: ["/og-image.png"],
    creator: "@managehubs",
    site: "@managehubs",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    other: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        url: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        url: "/favicon-16x16.png",
      },
    ],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}
      >
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
