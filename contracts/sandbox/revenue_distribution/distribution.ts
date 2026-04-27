// Issue #795 - Proportional distribution and member claim

import { getBeneficiaries, getBalance } from "./beneficiaryManager";

interface Distribution {
  id: string;
  allocations: Record<string, number>;
  claimed: Set<string>;
}

const distributions = new Map<string, Distribution>();

export function createDistribution(caller: string, distributionId: string): void {
  if (caller !== "admin") throw new Error("Unauthorized");

  const beneficiaries = getBeneficiaries();
  if (beneficiaries.length === 0) throw new Error("NoBeneficiaries");

  const balance = getBalance();
  if (balance === 0) throw new Error("NothingToDistribute");

  const allocations: Record<string, number> = {};
  for (const b of beneficiaries) {
    allocations[b.address] = Math.floor((balance * b.share_bps) / 10000);
  }

  distributions.set(distributionId, { id: distributionId, allocations, claimed: new Set() });
  console.log("Event: DistributionCreated", distributionId, allocations);
}

export function claim(beneficiary: string, distributionId: string): number {
  const dist = distributions.get(distributionId);
  if (!dist) throw new Error("DistributionNotFound");
  if (dist.claimed.has(beneficiary)) throw new Error("AlreadyClaimed");

  const amount = dist.allocations[beneficiary] ?? 0;
  if (amount === 0) throw new Error("NothingToClaim");

  dist.claimed.add(beneficiary);
  console.log(`Event: Claimed by ${beneficiary}, amount: ${amount}`);
  return amount;
}
