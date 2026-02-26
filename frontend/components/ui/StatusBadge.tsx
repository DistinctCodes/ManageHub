import React from 'react';
import { AssetStatus } from '../../types/asset';

interface StatusBadgeProps {
  status: AssetStatus;
}

const statusConfig: Record<AssetStatus, { bg: string; text: string }> = {
  [AssetStatus.ACTIVE]: { bg: 'bg-green-100', text: 'text-green-800' },
  [AssetStatus.ASSIGNED]: { bg: 'bg-blue-100', text: 'text-blue-800' },
  [AssetStatus.MAINTENANCE]: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  [AssetStatus.RETIRED]: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {status}
    </span>
  );
};
