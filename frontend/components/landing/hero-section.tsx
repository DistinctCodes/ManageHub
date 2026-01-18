// frontend/src/components/landing/hero-section.tsx
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white pt-32 pb-20">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-br from-blue-50/50 to-transparent" />
        <svg
          className="absolute right-0 top-0 h-full w-1/2 text-purple-50"
          fill="currentColor"
        >
          <defs>
            <pattern
              id="pattern"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pattern)" />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm text-blue-700">
            <Sparkles className="h-4 w-4" />
            <span>Trusted by 500+ professionals</span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Workspace management
            <br />
            <span className="text-blue-600">made simple</span>
          </h1>

          {/* Description */}
          <p className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl">
            Stop juggling spreadsheets and paper logs. ManageHub gives you
            biometric check-ins, instant payments, and real insights—all in one
            place.
          </p>

          {/* CTA */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="group inline-flex items-center gap-2 rounded-lg bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
            >
              Get started free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-base font-semibold text-gray-900 transition-colors hover:text-blue-600"
            >
              See pricing
            </Link>
          </div>

          {/* Trust line */}
          <p className="mt-8 text-sm text-gray-500">
            Free 14-day trial · No credit card required · Cancel anytime
          </p>
        </div>

        {/* Screenshot/Visual */}
        <div className="mt-16 sm:mt-24">
          <div className="relative mx-auto max-w-5xl">
            {/* Main dashboard preview */}
            <div className="relative rounded-xl bg-white shadow-2xl ring-1 ring-gray-900/10">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 rounded-t-xl">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1 text-sm text-gray-600">
                    <svg
                      className="h-3 w-3 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    managehub.ng
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-6 sm:p-8">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Welcome back, Adeleke
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Thursday, January 18, 2026
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Checked In
                    </span>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-600">Check-ins</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">24</p>
                    <p className="mt-1 text-xs text-green-600">
                      +12% this month
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-600">Hours</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">156</p>
                    <p className="mt-1 text-xs text-blue-600">~6.5 hrs/day</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-600">Streak</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      🔥 7
                    </p>
                    <p className="mt-1 text-xs text-orange-600">Keep it up!</p>
                  </div>
                </div>

                {/* Activity chart */}
                <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm font-medium text-gray-900">
                    Weekly Activity
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-2 h-24">
                    {[65, 45, 80, 60, 90, 55, 70].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-2"
                      >
                        <div
                          className="w-full rounded-t bg-blue-600 transition-all hover:bg-blue-700"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-gray-500">
                          {["M", "T", "W", "T", "F", "S", "S"][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating notification cards */}
            <div className="absolute -right-4 top-20 hidden rounded-lg border border-gray-200 bg-white p-3 shadow-lg lg:block">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <svg
                    className="h-4 w-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Payment received
                  </p>
                  <p className="text-xs text-gray-500">₦35,000 • Just now</p>
                </div>
              </div>
            </div>

            <div className="absolute -left-4 bottom-20 hidden rounded-lg border border-gray-200 bg-white p-3 shadow-lg lg:block">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="h-6 w-6 rounded-full bg-blue-500 ring-2 ring-white" />
                  <div className="h-6 w-6 rounded-full bg-purple-500 ring-2 ring-white" />
                  <div className="h-6 w-6 rounded-full bg-green-500 ring-2 ring-white" />
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">23</span> people
                  here now
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
