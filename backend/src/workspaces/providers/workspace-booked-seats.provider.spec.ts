import { WorkspaceBookedSeatsProvider } from './workspace-booked-seats.provider';
import { BookingStatus } from '../../bookings/enums/booking-status.enum';

describe('WorkspaceBookedSeatsProvider.getBookedSeats', () => {
  const buildQueryBuilder = (rawResult: { booked: string } | undefined) => {
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(rawResult),
    };
    return qb;
  };

  it('sums seatCount for overlapping PENDING/CONFIRMED bookings via the injected manager', async () => {
    const qb = buildQueryBuilder({ booked: '5' });
    const manager = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const bookingsRepository = { manager: {} } as any;
    const provider = new WorkspaceBookedSeatsProvider(bookingsRepository);

    const booked = await provider.getBookedSeats(
      'ws-1',
      '2026-08-01',
      '2026-08-05',
      manager as any,
    );

    expect(booked).toBe(5);
    expect(manager.createQueryBuilder).toHaveBeenCalled();
    expect(qb.where).toHaveBeenCalledWith('b.workspaceId = :workspaceId', {
      workspaceId: 'ws-1',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('b.status IN (:...statuses)', {
      statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
    });
    expect(qb.andWhere).toHaveBeenCalledWith('b.startDate <= :endDate', {
      endDate: '2026-08-05',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('b.endDate >= :startDate', {
      startDate: '2026-08-01',
    });
  });

  it('returns 0 when there are no overlapping bookings', async () => {
    const qb = buildQueryBuilder({ booked: '0' });
    const manager = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const bookingsRepository = { manager: {} } as any;
    const provider = new WorkspaceBookedSeatsProvider(bookingsRepository);

    const booked = await provider.getBookedSeats(
      'ws-1',
      '2026-08-01',
      '2026-08-05',
      manager as any,
    );

    expect(booked).toBe(0);
  });

  it('falls back to the repository manager when no transaction manager is passed', async () => {
    const qb = buildQueryBuilder({ booked: '2' });
    const repoManager = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const bookingsRepository = { manager: repoManager } as any;
    const provider = new WorkspaceBookedSeatsProvider(bookingsRepository);

    const booked = await provider.getBookedSeats(
      'ws-1',
      '2026-08-01',
      '2026-08-05',
    );

    expect(booked).toBe(2);
    expect(repoManager.createQueryBuilder).toHaveBeenCalled();
  });
});
