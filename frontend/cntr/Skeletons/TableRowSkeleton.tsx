import React from 'react';
interface Props { cols?: number; }
export const TableRowSkeleton: React.FC<Props> = ({ cols = 4 }) => (
  <div className="animate-pulse flex items-center gap-4 px-4 py-3 border-b border-gray-100">
    {Array.from({ length: cols }).map((_, i) => (
      <div key={i} className="h-4 bg-gray-200 rounded flex-1" />
    ))}
  </div>
);