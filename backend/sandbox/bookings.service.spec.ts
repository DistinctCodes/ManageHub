import { BadRequestException, NotFoundException } from '@nestjs/common';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

interface Booking {
  id: string;
  workspaceId: string;
  userId: string;
  status: BookingStatus;
  seats: number;
}

// Minimal inline service to keep the spec self-contained
class BookingsService {
  constructor(private readonly repo: { findById: jest.Mock; save: jest.Mock; countSeats: jest.Mock }) {}

  async create(workspaceId: string, userId: string, seats: number): Promise<Booking> {
    const taken = await this.repo.countSeats(workspaceId);
    if (taken + seats > 10) throw new BadRequestException('Not enough seats');
    const booking: Booking = { id: 'b1', workspaceId, userId, seats, status: 'pending' };
    return this.repo.save(booking);
  }

  async confirm(id: string): Promise<Booking> {
    const b = await this.repo.findById(id);
    if (!b) throw new NotFoundException('Booking not found');
    b.status = 'confirmed';
    return this.repo.save(b);
  }

  async cancel(id: string): Promise<Booking> {
    const b = await this.repo.findById(id);
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status === 'completed') throw new BadRequestException('Cannot cancel a completed booking');
    b.status = 'cancelled';
    return this.repo.save(b);
  }
}

describe('BookingsService', () => {
  let service: BookingsService;
  const repo = { findById: jest.fn(), save: jest.fn(), countSeats: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookingsService(repo);
  });

  it('creates a booking when seats are available', async () => {
    repo.countSeats.mockResolvedValue(5);
    repo.save.mockImplementation(async b => b);
    const result = await service.create('ws-1', 'u-1', 3);
    expect(result.status).toBe('pending');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('rejects booking when seats are insufficient', async () => {
    repo.countSeats.mockResolvedValue(9);
    await expect(service.create('ws-1', 'u-1', 3)).rejects.toThrow(BadRequestException);
  });

  it('confirms a pending booking', async () => {
    const booking: Booking = { id: 'b1', workspaceId: 'ws-1', userId: 'u-1', seats: 2, status: 'pending' };
    repo.findById.mockResolvedValue(booking);
    repo.save.mockImplementation(async b => b);
    const result = await service.confirm('b1');
    expect(result.status).toBe('confirmed');
  });

  it('cancels a confirmed booking', async () => {
    const booking: Booking = { id: 'b1', workspaceId: 'ws-1', userId: 'u-1', seats: 2, status: 'confirmed' };
    repo.findById.mockResolvedValue(booking);
    repo.save.mockImplementation(async b => b);
    const result = await service.cancel('b1');
    expect(result.status).toBe('cancelled');
  });

  it('prevents cancelling a completed booking', async () => {
    const booking: Booking = { id: 'b1', workspaceId: 'ws-1', userId: 'u-1', seats: 2, status: 'completed' };
    repo.findById.mockResolvedValue(booking);
    await expect(service.cancel('b1')).rejects.toThrow(BadRequestException);
  });

  it('throws 404 when booking not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.confirm('missing')).rejects.toThrow(NotFoundException);
  });
});
