import React from 'react';
export const MemberRowSkeleton: React.FC = () => (
  <div className="animate-pulse flex items-center gap-4 px-4 py-3 border-b border-gray-100">
    <div className="h-9 w-9 bg-gray-200 rounded-full shrink-0" />
    <div className="flex-1 space-y-1.5">
      <div className="h-4 bg-gray-200 rounded w-40" />
      <div className="h-3 bg-gray-200 rounded w-56" />
    </div>
    <div className="h-6 bg-gray-200 rounded w-20" />
  </div>
);