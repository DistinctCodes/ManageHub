import { CreditsAdminController } from './credits-admin.controller';
import { UserRole } from '../auth/enums/user-role.enum';

describe('CreditsAdminController', () => {
  it('posts an audited member balance adjustment with the current admin', async () => {
    const transaction = {
      id: 'transaction-1',
      kind: 'ADJUSTMENT',
      reference: 'support-case-1',
      currency: 'USD',
      amount: 1000,
      description: 'Support correction',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const credits = {
      adjust: jest.fn().mockResolvedValue({ transaction }),
    };
    const controller = new CreditsAdminController(
      credits as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const dto = {
      userId: 'member-1',
      delta: 1000,
      currency: 'USD',
      reference: 'support-case-1',
      reason: 'Support correction',
    };

    const result = await controller.adjust(dto, {
      id: 'admin-1',
      role: UserRole.ADMIN,
    });

    expect(credits.adjust).toHaveBeenCalledWith({
      userId: dto.userId,
      delta: dto.delta,
      currency: dto.currency,
      reference: dto.reference,
      reason: dto.reason,
      actorId: 'admin-1',
    });
    expect(result.id).toBe('transaction-1');
    expect(result.amount).toBe(1000);
  });
});
