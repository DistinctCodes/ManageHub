"use client";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <svg className="w-24 h-24 text-red-400 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <h1 className="text-4xl font-bold text-gray-800 mb-2">Something went wrong</h1>
      <p className="text-gray-500 mb-2">{error?.message ?? "An unexpected error occurred."}</p>
      <p className="text-sm text-gray-400 mb-8">Please try again or return home.</p>
      <div className="flex gap-4">
        <button onClick={reset} className="px-5 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">
          Try again
        </button>
        <Link href="/" className="px-5 py-2 border border-gray-300 rounded hover:bg-gray-50 transition">
          Go home
        </Link>
      </div>
    </div>
  );
}
