import { assertSorobanContractVersions } from './soroban-contract-version';

describe('assertSorobanContractVersions', () => {
  const config = {
    contractId: 'CESCROW',
    revenueDistributionContractId: 'CDISTRIBUTION',
    treasuryPublicKey: 'GTREASURY',
  };

  it('checks both configured contracts against their expected versions', async () => {
    const readVersion = jest
      .fn()
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2);

    await expect(
      assertSorobanContractVersions(config, readVersion),
    ).resolves.toBeUndefined();
    expect(readVersion.mock.calls).toEqual([
      ['CESCROW', 'GTREASURY'],
      ['CDISTRIBUTION', 'GTREASURY'],
    ]);
  });

  it('rejects a mismatched version with the contract name and expected value', async () => {
    const readVersion = jest.fn().mockResolvedValueOnce(1);

    await expect(
      assertSorobanContractVersions(config, readVersion),
    ).rejects.toThrow(
      'payment_escrow interface version mismatch: expected 2, got 1',
    );
    expect(readVersion).toHaveBeenCalledTimes(1);
  });
});
