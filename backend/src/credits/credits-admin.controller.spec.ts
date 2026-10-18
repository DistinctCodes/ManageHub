import { CreditsAdminController } from './credits-admin.controller';

describe('CreditsAdminController', () => {
  let controller: CreditsAdminController;
  let ledger: { listAccountsPage: jest.Mock; checkIntegrity: jest.Mock };
  let settlement: { runSettlement: jest.Mock };

  beforeEach(() => {
    ledger = {
      listAccountsPage: jest.fn().mockResolvedValue({
        accounts: [],
        nextCursor: 'next-page',
      }),
      checkIntegrity: jest.fn().mockResolvedValue({
        accountsChecked: 0,
        balanceDrift: [],
        unbalancedTransactions: [],
      }),
    };
    settlement = {
      runSettlement: jest.fn().mockResolvedValue({
        batchesCreated: 0,
        batchesExecuted: 0,
        payoutsSubmitted: 0,
        payoutsConfirmed: 0,
        payoutsFailed: 0,
        payoutsAwaitingRail: 0,
        entriesSettled: 0,
        notes: [],
      }),
    };
    controller = new CreditsAdminController(
      {} as any,
      ledger as any,
      {} as any,
      settlement as any,
      {} as any,
      {} as any,
    );
  });

  it('returns a page of ledger accounts and its continuation cursor', async () => {
    await expect(
      controller.listAccounts('USD', '25', 'cursor'),
    ).resolves.toEqual({
      data: [],
      nextCursor: 'next-page',
    });
    expect(ledger.listAccountsPage).toHaveBeenCalledWith('USD', 25, 'cursor');
  });

  it('returns an integrity report for the ledger', async () => {
    await expect(controller.checkIntegrity()).resolves.toMatchObject({
      accountsChecked: 0,
      balanceDrift: [],
      unbalancedTransactions: [],
    });
    expect(ledger.checkIntegrity).toHaveBeenCalledWith(undefined);
  });

  it('runs a settlement pass and returns its summary', async () => {
    await expect(controller.runSettlement()).resolves.toMatchObject({
      batchesCreated: 0,
      payoutsConfirmed: 0,
      notes: [],
    });
    expect(settlement.runSettlement).toHaveBeenCalledTimes(1);
  });
});
