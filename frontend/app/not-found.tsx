"use client"
import Link from "next/link"
import { Home, ArrowLeft, SearchX } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Animated Icon */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-purple-200 dark:bg-purple-900 rounded-full blur-3xl opacity-30 animate-pulse" />
          <div className="relative bg-white dark:bg-gray-800 rounded-full p-4 sm:p-6 md:p-8 shadow-xl dark:shadow-purple-900/30">
            <SearchX className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-purple-600 dark:text-purple-400 mx-auto" strokeWidth={1.5} />
          </div>
        </div>

        {/* 404 Text */}
        <div className="space-y-2">
          <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            404
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-purple-600 to-pink-600 mx-auto rounded-full" />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            Oops! The page you're looking for seems to have wandered off. 
            Let's get you back on track.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/"
            className="group flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium px-8 py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Home className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>

          <button
            onClick={() => window.history.back()}
            className="group flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium px-8 py-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Go Back</span>
          </button>
        </div>

        {/* Additional Info */}
        <div className="pt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Error Code: <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">404</span>
          </p>
        </div>
      </div>
    </div>
  )
}