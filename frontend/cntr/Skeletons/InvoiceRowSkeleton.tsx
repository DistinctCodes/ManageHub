import React from 'react';
export const InvoiceRowSkeleton: React.FC = () => (
  <div className="animate-pulse flex items-center gap-4 px-4 py-3 border-b border-gray-100">
    <div className="h-4 bg-gray-200 rounded w-24" />
    <div className="h-4 bg-gray-200 rounded w-32 flex-1" />
    <div className="h-4 bg-gray-200 rounded w-20" />
    <div className="h-6 bg-gray-200 rounded w-16" />
  </div>
);