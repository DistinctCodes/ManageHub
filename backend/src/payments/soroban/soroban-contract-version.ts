import { SorobanConfig } from './soroban-config';

export const PAYMENT_ESCROW_INTERFACE_VERSION = 2;
export const REVENUE_DISTRIBUTION_INTERFACE_VERSION = 2;

export async function assertSorobanContractVersions(
  config: Pick<
    SorobanConfig,
    'contractId' | 'revenueDistributionContractId' | 'treasuryPublicKey'
  >,
  readVersion: (
    contractId: string,
    sourceAccountPublicKey: string,
  ) => Promise<number>,
): Promise<void> {
  const contracts = [
    {
      name: 'payment_escrow',
      contractId: config.contractId,
      expectedVersion: PAYMENT_ESCROW_INTERFACE_VERSION,
    },
    {
      name: 'revenue_distribution',
      contractId: config.revenueDistributionContractId,
      expectedVersion: REVENUE_DISTRIBUTION_INTERFACE_VERSION,
    },
  ];

  for (const contract of contracts) {
    const actualVersion = await readVersion(
      contract.contractId,
      config.treasuryPublicKey,
    );
    if (actualVersion !== contract.expectedVersion) {
      throw new Error(
        `${contract.name} interface version mismatch: expected ` +
          `${contract.expectedVersion}, got ${actualVersion}`,
      );
    }
  }
}
