import { CreditsController } from './credits.controller';
import { UserRole } from '../auth/enums/user-role.enum';

describe('CreditsController', () => {
  let controller: CreditsController;
  let credits: { getBalance: jest.Mock };
  let ledger: { listEntries: jest.Mock };
  let usage: { listForUser: jest.Mock };

  beforeEach(() => {
    credits = {
      getBalance: jest.fn().mockResolvedValue({
        accountId: null,
        userId: 'user-123',
        currency: 'USD',
        balance: 0,
        overdraftLimit: 0,
        spendable: 0,
        frozen: false,
      }),
    };
    ledger = { listEntries: jest.fn().mockResolvedValue([]) };
    usage = { listForUser: jest.fn().mockResolvedValue([]) };
    controller = new CreditsController(
      credits as any,
      ledger as any,
      usage as any,
      {} as any,
      {} as any,
    );
  });

  it('returns the current user balance', async () => {
    const user = { id: 'user-123', role: UserRole.USER };

    await expect(controller.myBalance(user)).resolves.toMatchObject({
      accountId: null,
      userId: 'user-123',
      currency: 'USD',
      balance: 0,
    });
    expect(credits.getBalance).toHaveBeenCalledWith('user-123', undefined);
  });

  it('returns an empty statement when the user has no ledger account', async () => {
    await expect(
      controller.myStatement({ id: 'user-123', role: UserRole.USER }),
    ).resolves.toEqual([]);
    expect(ledger.listEntries).not.toHaveBeenCalled();
  });

  it('returns the current user usage history', async () => {
    await expect(
      controller.myUsage({ id: 'user-123', role: UserRole.USER }),
    ).resolves.toEqual([]);
    expect(usage.listForUser).toHaveBeenCalledWith('user-123');
  });
});
