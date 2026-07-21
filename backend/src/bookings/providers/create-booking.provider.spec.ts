import { CreateBookingProvider } from './create-booking.provider';
import { PlanType } from '../enums/plan-type.enum';

describe('CreateBookingProvider.create', () => {
  let dataSource: { transaction: jest.Mock };
  let manager: any;
  let workspaceBookedSeatsProvider: { getBookedSeats: jest.Mock };
  let pricingService: { calculateAmount: jest.Mock };
  let usersRepository: { findOne: jest.Mock };
  let emailService: { sendBookingCreatedEmail: jest.Mock };
  let provider: CreateBookingProvider;

  const dto = {
    workspaceId: 'ws-1',
    planType: PlanType.DAILY,
    startDate: '2026-08-01',
    endDate: '2026-08-02',
    seatCount: 3,
  };

  const workspace = (overrides: Partial<any> = {}) => ({
    id: 'ws-1',
    name: 'Test Space',
    totalSeats: 10,
    availableSeats: 10,
    isActive: true,
    hourlyRate: 1000,
    ...overrides,
  });

  beforeEach(() => {
    manager = {
      createQueryBuilder: jest.fn(),
      create: jest.fn((_entity, data) => data),
      save: jest.fn((entityOrData) => Promise.resolve(entityOrData)),
    };
    dataSource = {
      transaction: jest.fn((cb) => cb(manager)),
    };
    workspaceBookedSeatsProvider = { getBookedSeats: jest.fn() };
    pricingService = { calculateAmount: jest.fn().mockReturnValue(50000) };
    usersRepository = { findOne: jest.fn().mockResolvedValue(null) };
    emailService = { sendBookingCreatedEmail: jest.fn() };

    provider = new CreateBookingProvider(
      {} as any,
      usersRepository as any,
      pricingService as any,
      dataSource as any,
      emailService as any,
      workspaceBookedSeatsProvider as any,
    );
  });

  const mockWorkspaceLockQuery = (ws: any) => {
    manager.createQueryBuilder.mockReturnValue({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(ws),
    });
  };

  it('decrements availableSeats by the booked seat count on success', async () => {
    const ws = workspace();
    mockWorkspaceLockQuery(ws);
    workspaceBookedSeatsProvider.getBookedSeats.mockResolvedValue(0);

    await provider.create(dto as any, 'user-1');

    expect(ws.availableSeats).toBe(7);
    expect(manager.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ availableSeats: 7 }),
    );
  });

  it('clamps the decrement at 0 rather than going negative', async () => {
    const ws = workspace({ availableSeats: 1 });
    mockWorkspaceLockQuery(ws);
    workspaceBookedSeatsProvider.getBookedSeats.mockResolvedValue(0);

    await provider.create(dto as any, 'user-1');

    expect(ws.availableSeats).toBe(0);
  });

  it('rejects and leaves availableSeats untouched when seats overlap beyond capacity', async () => {
    const ws = workspace({ totalSeats: 5, availableSeats: 5 });
    mockWorkspaceLockQuery(ws);
    // 3 already booked + 3 requested > totalSeats(5)
    workspaceBookedSeatsProvider.getBookedSeats.mockResolvedValue(3);

    await expect(provider.create(dto as any, 'user-1')).rejects.toThrow();

    expect(ws.availableSeats).toBe(5);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('passes the shared overlap query the requested workspace and date range', async () => {
    const ws = workspace();
    mockWorkspaceLockQuery(ws);
    workspaceBookedSeatsProvider.getBookedSeats.mockResolvedValue(0);

    await provider.create(dto as any, 'user-1');

    expect(workspaceBookedSeatsProvider.getBookedSeats).toHaveBeenCalledWith(
      'ws-1',
      '2026-08-01',
      '2026-08-02',
      manager,
    );
  });
});
