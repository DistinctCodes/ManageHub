"use client";

import Link from "next/link";
import CountdownTimer from "./components/CountdownTimer";

export default function SandboxPage() {
  const bookingStart = new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString();
  const membershipExpiry = new Date(Date.now() + 1000 * 60 * 60 * 5 + 1000 * 60 * 12).toISOString();

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <section>
        <h1 className="text-3xl font-bold text-gray-900">Sandbox UI Features</h1>
        <p className="mt-2 text-gray-600">Feature demos for FE-44, FE-45, FE-46, and FE-47.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Countdown Timer</h2>
        <CountdownTimer targetDate={bookingStart} label="Upcoming booking starts in" />
        <CountdownTimer targetDate={membershipExpiry} label="Membership expires in" compact />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">New Sandbox Pages</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/sandbox/badges" className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
            Member Badge Gallery
          </Link>
          <Link href="/sandbox/search" className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
            Global Search
          </Link>
          <Link href="/sandbox/workspaces/compare" className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
            Workspace Compare
          </Link>
        </div>
      </section>
    </main>
  );
}
