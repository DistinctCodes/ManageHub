// Issue #796 - Revenue distribution query functions

import { getBeneficiaries, getBalance, Beneficiary } from "./beneficiaryManager";

interface Distribution {
  id: string;
  allocations: Record<string, number>;
  claimed: Set<string>;
}

// Shared registry — in real usage this would be injected or imported from a shared store
const distributionRegistry = new Map<string, Distribution>();

export function queryBeneficiaries(): Beneficiary[] {
  return getBeneficiaries();
}

export function queryDistribution(id: string): Distribution {
  const dist = distributionRegistry.get(id);
  if (!dist) throw new Error("DistributionNotFound");
  return dist;
}

export function queryAllDistributions(): string[] {
  return Array.from(distributionRegistry.keys());
}

export function hasClaimed(distributionId: string, beneficiary: string): boolean {
  const dist = distributionRegistry.get(distributionId);
  if (!dist) return false;
  return dist.claimed.has(beneficiary);
}

export function queryContractBalance(): number {
  return getBalance();
}

export { distributionRegistry };
