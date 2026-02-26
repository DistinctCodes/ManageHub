import React from 'react';
import { AssetCondition } from '../../types/asset';

interface ConditionBadgeProps {
  condition: AssetCondition;
}

const conditionConfig: Record<AssetCondition, { bg: string; text: string }> = {
  [AssetCondition.NEW]: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  [AssetCondition.GOOD]: { bg: 'bg-green-100', text: 'text-green-800' },
  [AssetCondition.FAIR]: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  [AssetCondition.POOR]: { bg: 'bg-red-100', text: 'text-red-800' },
};

export const ConditionBadge: React.FC<ConditionBadgeProps> = ({ condition }) => {
  const config = conditionConfig[condition] || { bg: 'bg-gray-100', text: 'text-gray-800' };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {condition}
    </span>
  );
};
