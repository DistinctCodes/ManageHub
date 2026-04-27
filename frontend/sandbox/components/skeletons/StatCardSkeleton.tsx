"use client";

export default function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
      </div>
      <div className="flex items-end gap-2">
        <div className="h-9 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-12 bg-gray-200 rounded animate-pulse mb-0.5" />
      </div>
    </div>
  );
}
