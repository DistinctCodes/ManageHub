"use client";

import { useGetMemberStats } from "@/lib/react-query/hooks/members"; // Ensure hook path

export function MemberStats() {
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetMemberStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Loading</p>
            <div className="h-8 w-16 bg-gray-100 animate-pulse mt-2 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not load member stats right now.";

    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold text-red-700">Unable to load member stats</p>
        <p className="mt-1 text-sm text-red-600">{message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const cards = [
    { label: "Total Members", value: stats.total },
    { label: "Active", value: stats.active },
    { label: "Suspended", value: stats.suspended },
    { label: "New This Month", value: stats.newThisMonth },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-white p-5 rounded-xl border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {card.label}
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
        </div>
      ))}
    </div>
  );
}