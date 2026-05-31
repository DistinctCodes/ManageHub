import React from 'react';
export const WorkspaceCardSkeleton: React.FC = () => (
  <div className="animate-pulse rounded-lg border border-gray-200 p-4 space-y-3">
    <div className="h-32 bg-gray-200 rounded" />
    <div className="h-4 bg-gray-200 rounded w-3/4" />
    <div className="h-3 bg-gray-200 rounded w-1/2" />
    <div className="flex gap-2">
      <div className="h-6 bg-gray-200 rounded w-16" />
      <div className="h-6 bg-gray-200 rounded w-16" />
    </div>
  </div>
);