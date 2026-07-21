import { CheckWorkspaceAvailabilityProvider } from './check-workspace-availability.provider';

describe('CheckWorkspaceAvailabilityProvider.check', () => {
  let findWorkspaceByIdProvider: { findById: jest.Mock };
  let workspaceBookedSeatsProvider: { getBookedSeats: jest.Mock };
  let provider: CheckWorkspaceAvailabilityProvider;

  const workspace = (overrides: Partial<any> = {}) => ({
    id: 'ws-1',
    totalSeats: 10,
    isActive: true,
    ...overrides,
  });

  beforeEach(() => {
    findWorkspaceByIdProvider = { findById: jest.fn() };
    workspaceBookedSeatsProvider = { getBookedSeats: jest.fn() };
    provider = new CheckWorkspaceAvailabilityProvider(
      findWorkspaceByIdProvider as any,
      workspaceBookedSeatsProvider as any,
    );
  });

  it('reports 0 available seats once every seat is booked for the range', async () => {
    findWorkspaceByIdProvider.findById.mockResolvedValue(workspace());
    workspaceBookedSeatsProvider.getBookedSeats.mockResolvedValue(10);

    const result = await provider.check('ws-1', 1, '2026-08-01', '2026-08-02');

    expect(result.availableSeats).toBe(0);
    expect(result.available).toBe(false);
  });

  it('reports freed seats once bookings no longer overlap (e.g. after a cancellation)', async () => {
    findWorkspaceByIdProvider.findById.mockResolvedValue(workspace());
    workspaceBookedSeatsProvider.getBookedSeats.mockResolvedValue(3);

    const result = await provider.check('ws-1', 1, '2026-08-01', '2026-08-02');

    expect(result.availableSeats).toBe(7);
    expect(result.available).toBe(true);
  });

  it('is unavailable for an inactive workspace regardless of bookings', async () => {
    findWorkspaceByIdProvider.findById.mockResolvedValue(
      workspace({ isActive: false }),
    );

    const result = await provider.check('ws-1', 1);

    expect(result.available).toBe(false);
    expect(result.availableSeats).toBe(0);
    expect(workspaceBookedSeatsProvider.getBookedSeats).not.toHaveBeenCalled();
  });

  it('defaults the date range to today when no dates are given', async () => {
    findWorkspaceByIdProvider.findById.mockResolvedValue(workspace());
    workspaceBookedSeatsProvider.getBookedSeats.mockResolvedValue(0);

    const todayIso = new Date().toISOString().slice(0, 10);
    const result = await provider.check('ws-1');

    expect(result.startDate).toBe(todayIso);
    expect(result.endDate).toBe(todayIso);
    expect(workspaceBookedSeatsProvider.getBookedSeats).toHaveBeenCalledWith(
      'ws-1',
      todayIso,
      todayIso,
    );
  });

  it('reflects requestedSeats against the live available count', async () => {
    findWorkspaceByIdProvider.findById.mockResolvedValue(workspace());
    workspaceBookedSeatsProvider.getBookedSeats.mockResolvedValue(8);

    const result = await provider.check('ws-1', 3, '2026-08-01', '2026-08-02');

    expect(result.availableSeats).toBe(2);
    expect(result.available).toBe(false);
    expect(result.message).toBe('Only 2 seats available');
  });
});
