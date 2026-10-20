import { CreditsController } from './credits.controller';
import { UserRole } from '../auth/enums/user-role.enum';

describe('CreditsController', () => {
  it('charges a member through the ledger with the authenticated actor', async () => {
    const transaction = {
      id: 'transaction-1',
      kind: 'CHARGE',
      reference: 'job-1',
      currency: 'USD',
      amount: 500,
      description: 'Print job',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const credits = {
      charge: jest.fn().mockResolvedValue({
        transaction,
        posted: true,
        balanceAfter: 500,
        currency: 'USD',
      }),
    };
    const controller = new CreditsController(
      credits as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const dto = {
      userId: 'member-1',
      amount: 500,
      currency: 'USD',
      reference: 'job-1',
      reason: 'Print job',
      metadata: { jobId: 'job-1' },
    };

    const result = await controller.charge(dto, {
      id: 'admin-1',
      role: UserRole.ADMIN,
    });

    expect(credits.charge).toHaveBeenCalledWith({
      ...dto,
      actorId: 'admin-1',
    });
    expect(result).toMatchObject({
      posted: true,
      balanceAfter: 500,
      currency: 'USD',
    });
    expect(result.transaction.id).toBe('transaction-1');
  });
});
