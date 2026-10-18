import { CreditsAdminController } from './credits-admin.controller';

describe('CreditsAdminController', () => {
  it('returns a page of ledger accounts from the ledger service', async () => {
    const ledger = {
      listAccountsPage: jest
        .fn()
        .mockResolvedValue({ accounts: [], nextCursor: null }),
    };
    const controller = new CreditsAdminController(
      {} as never,
      ledger as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(controller.listAccounts()).resolves.toEqual({
      data: [],
      nextCursor: null,
    });
    expect(ledger.listAccountsPage).toHaveBeenCalledWith(
      undefined,
      50,
      undefined,
    );
  });

  it('rejects an invalid account page limit', async () => {
    const controller = new CreditsAdminController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(controller.listAccounts(undefined, '0')).rejects.toThrow(
      'limit must be a positive integer',
    );
  });
});
