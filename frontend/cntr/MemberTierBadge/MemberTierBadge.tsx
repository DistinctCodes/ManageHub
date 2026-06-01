import React from 'react';
import { Award } from 'lucide-react';

export type MemberTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

const tierConfig: Record<MemberTier, { color: string; label: string }> = {
  BRONZE:   { color: '#CD7F32', label: 'Bronze' },
  SILVER:   { color: '#C0C0C0', label: 'Silver' },
  GOLD:     { color: '#FFD700', label: 'Gold' },
  PLATINUM: { color: '#E5E4E2', label: 'Platinum' },
};

export function MemberTierBadge({ tier }: { tier: MemberTier }) {
  const { color, label } = tierConfig[tier];
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: color }}>
      <Award size={12} />
      {label}
    </span>
  );
}