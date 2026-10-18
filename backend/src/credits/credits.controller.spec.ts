import { CreditsController } from './credits.controller';

describe('CreditsController', () => {
  it('returns the signed-in user balance', async () => {
    const credits = {
      getBalance: jest.fn().mockResolvedValue({
        accountId: 'account-1',
        userId: 'user-1',
        currency: 'USD',
        balance: 500,
        overdraftLimit: 0,
        spendable: 500,
        frozen: false,
      }),
    };
    const controller = new CreditsController(
      credits as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const result = await controller.myBalance({ id: 'user-1' } as never);
    expect(credits.getBalance).toHaveBeenCalledWith('user-1', undefined);
    expect(result).toMatchObject({
      userId: 'user-1',
      balance: 500,
      currency: 'USD',
    });
  });

  it('returns no statement entries when the user has no ledger account', async () => {
    const credits = {
      getBalance: jest.fn().mockResolvedValue({ accountId: null }),
    };
    const ledger = { listEntries: jest.fn() };
    const controller = new CreditsController(
      credits as never,
      ledger as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      controller.myStatement({ id: 'user-1' } as never),
    ).resolves.toEqual([]);
    expect(ledger.listEntries).not.toHaveBeenCalled();
  });
});
