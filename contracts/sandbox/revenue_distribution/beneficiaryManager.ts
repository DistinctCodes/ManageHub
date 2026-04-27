// Issue #794 - Revenue deposit and beneficiary management

export interface Beneficiary {
  address: string;
  share_bps: number; // basis points, must sum to 10000
}

const store: { beneficiaries: Beneficiary[]; balance: number } = {
  beneficiaries: [],
  balance: 0,
};

export function setBeneficiaries(caller: string, beneficiaries: Beneficiary[]): void {
  if (caller !== "admin") throw new Error("Unauthorized");

  const total = beneficiaries.reduce((sum, b) => sum + b.share_bps, 0);
  if (total !== 10000) throw new Error("InvalidShares: shares must sum to 10000");

  store.beneficiaries = [...beneficiaries];
  console.log("Event: BeneficiariesSet", beneficiaries);
}

export function depositRevenue(depositor: string, amount: number): void {
  if (amount <= 0) throw new Error("InvalidAmount");

  store.balance += amount;
  console.log(`Event: RevenueDeposited by ${depositor}, amount: ${amount}`);
}

export function getBalance(): number {
  return store.balance;
}

export function getBeneficiaries(): Beneficiary[] {
  return store.beneficiaries;
}
