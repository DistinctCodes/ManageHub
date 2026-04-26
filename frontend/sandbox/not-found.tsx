import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <svg className="w-24 h-24 text-blue-400 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h1 className="text-5xl font-bold text-gray-800 mb-2">404</h1>
      <p className="text-lg text-gray-500 mb-8">Oops! The page you're looking for doesn't exist.</p>
      <Link href="/dashboard" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
        Go to Dashboard
      </Link>
    </div>
  );
}
