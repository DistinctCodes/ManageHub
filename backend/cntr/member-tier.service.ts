export type MemberTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface MemberStats {
  totalBookings: number;
  totalSpendKobo: number;
}

export function classifyMemberTier(stats: MemberStats): MemberTier {
  const { totalBookings, totalSpendKobo } = stats;
  if (totalBookings >= 100 || totalSpendKobo >= 10_000_000) return 'PLATINUM';
  if (totalBookings >= 30 || totalSpendKobo >= 2_000_000) return 'GOLD';
  if (totalBookings >= 10 || totalSpendKobo >= 500_000) return 'SILVER';
  return 'BRONZE';
}
