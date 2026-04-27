"use client";

interface TableRowSkeletonProps {
  columns?: number;
  rows?: number;
}

export default function TableRowSkeleton({ columns = 5, rows = 5 }: TableRowSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-gray-200 rounded animate-pulse flex-1"
              style={{ maxWidth: `${100 / columns}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
