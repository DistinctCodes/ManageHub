import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { PaymentRail } from './enums/payment-rail.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { UserRole } from '../auth/enums/user-role.enum';

type MockRepository = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

function makeRepository(): MockRepository {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((data) => ({ ...data })),
    save: jest.fn(async (entity) => ({
      id: entity.id ?? 'generated-id',
      ...entity,
    })),
  };
}

function makeDto(
  overrides: Partial<InitiatePaymentDto> = {},
): InitiatePaymentDto {
  return {
    bookingId: 'booking-1',
    amount: 5000,
    currency: 'usd',
    rail: PaymentRail.FIAT,
    ...overrides,
  };
}

function uniqueViolation(constraint: string) {
  return Object.assign(
    new Error('duplicate key value violates unique constraint'),
    {
      code: '23505',
      constraint,
    },
  );
}

describe('PaymentsService', () => {
  let repository: MockRepository;
  let railAdapter: { initiate: jest.Mock };
  let railRegistry: { get: jest.Mock };
  let config: { get: jest.Mock };
  let service: PaymentsService;

  beforeEach(() => {
    repository = makeRepository();
    railAdapter = {
      initiate: jest.fn().mockResolvedValue({ providerReference: 'ref-1' }),
    };
    railRegistry = { get: jest.fn().mockReturnValue(railAdapter) };
    config = { get: jest.fn().mockReturnValue(30) };
    service = new PaymentsService(
      repository as any,
      railRegistry as any,
      config as any,
    );
  });

  describe('initiate', () => {
    it('rejects when the Idempotency-Key header is missing', async () => {
      await expect(service.initiate('user-1', '', makeDto())).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('creates a new INITIATED payment then progresses it to AWAITING_CONFIRMATION', async () => {
      repository.findOne.mockResolvedValueOnce(null); // no existing idempotency-key row
      repository.findOne.mockResolvedValueOnce(null); // booking is free

      const result = await service.initiate('user-1', 'key-1', makeDto());

      expect(result.status).toBe(PaymentStatus.AWAITING_CONFIRMATION);
      expect(result.providerReference).toBe('ref-1');
      expect(railAdapter.initiate).toHaveBeenCalledTimes(1);
      expect(repository.save).toHaveBeenCalledTimes(2);
    });

    it('replays the same Idempotency-Key and returns the original payment without creating a duplicate', async () => {
      const existing = {
        id: 'p-1',
        userId: 'user-1',
        bookingId: 'booking-1',
        amount: 5000,
        currency: 'USD',
        rail: PaymentRail.FIAT,
        status: PaymentStatus.AWAITING_CONFIRMATION,
      } as unknown as Payment;
      repository.findOne.mockResolvedValueOnce(existing);

      const result = await service.initiate('user-1', 'key-1', makeDto());

      expect(result).toBe(existing);
      expect(repository.save).not.toHaveBeenCalled();
      expect(railAdapter.initiate).not.toHaveBeenCalled();
    });

    it('rejects when the same Idempotency-Key is replayed with a different payload', async () => {
      const existing = {
        id: 'p-1',
        userId: 'user-1',
        bookingId: 'booking-1',
        amount: 9999,
        currency: 'USD',
        rail: PaymentRail.FIAT,
        status: PaymentStatus.INITIATED,
      } as unknown as Payment;
      repository.findOne.mockResolvedValueOnce(existing);

      await expect(
        service.initiate('user-1', 'key-1', makeDto()),
      ).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejects initiation when the booking already has a non-terminal payment', async () => {
      repository.findOne.mockResolvedValueOnce(null);
      repository.findOne.mockResolvedValueOnce({
        status: PaymentStatus.AWAITING_CONFIRMATION,
      } as unknown as Payment);

      await expect(
        service.initiate('user-1', 'key-1', makeDto()),
      ).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejects initiation when the booking already has a confirmed payment', async () => {
      repository.findOne.mockResolvedValueOnce(null);
      repository.findOne.mockResolvedValueOnce({
        status: PaymentStatus.CONFIRMED,
      } as unknown as Payment);

      await expect(
        service.initiate('user-1', 'key-1', makeDto()),
      ).rejects.toThrow(ConflictException);
    });

    it('resolves an Idempotency-Key race by returning the row the concurrent request created', async () => {
      const winner = {
        id: 'p-winner',
        userId: 'user-1',
        bookingId: 'booking-1',
        amount: 5000,
        currency: 'USD',
        rail: PaymentRail.FIAT,
        status: PaymentStatus.INITIATED,
      } as unknown as Payment;

      repository.findOne
        .mockResolvedValueOnce(null) // pre-check: no row yet
        .mockResolvedValueOnce(null) // booking free at pre-check time
        .mockResolvedValueOnce(winner); // recovery lookup after losing the insert race

      repository.save.mockRejectedValueOnce(
        uniqueViolation('uq_payments_user_id_idempotency_key'),
      );

      const result = await service.initiate('user-1', 'key-1', makeDto());

      expect(result).toBe(winner);
      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(railAdapter.initiate).not.toHaveBeenCalled();
    });

    it('rejects a booking-level race with a conflict instead of creating a second row', async () => {
      repository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      repository.save.mockRejectedValueOnce(
        uniqueViolation('uq_payments_booking_id_non_terminal'),
      );

      await expect(
        service.initiate('user-1', 'key-1', makeDto()),
      ).rejects.toThrow(ConflictException);
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('rethrows unrelated database errors', async () => {
      repository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      repository.save.mockRejectedValueOnce(new Error('connection lost'));

      await expect(
        service.initiate('user-1', 'key-1', makeDto()),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('transitionStatus', () => {
    it('allows a legal transition', () => {
      const payment = { status: PaymentStatus.INITIATED } as unknown as Payment;
      service.transitionStatus(payment, PaymentStatus.FAILED);
      expect(payment.status).toBe(PaymentStatus.FAILED);
    });

    it('throws on an illegal transition and leaves status untouched', () => {
      const payment = { status: PaymentStatus.INITIATED } as unknown as Payment;
      expect(() =>
        service.transitionStatus(payment, PaymentStatus.CONFIRMED),
      ).toThrow();
      expect(payment.status).toBe(PaymentStatus.INITIATED);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the payment does not exist', async () => {
      repository.findOne.mockResolvedValueOnce(null);
      await expect(
        service.findOne('missing', { id: 'user-1', role: UserRole.USER }),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows the owner to view their own payment', async () => {
      repository.findOne.mockResolvedValueOnce({
        id: 'p-1',
        userId: 'user-1',
      } as unknown as Payment);
      await expect(
        service.findOne('p-1', { id: 'user-1', role: UserRole.USER }),
      ).resolves.toMatchObject({ id: 'p-1' });
    });

    it('allows an admin to view any payment', async () => {
      repository.findOne.mockResolvedValueOnce({
        id: 'p-1',
        userId: 'someone-else',
      } as unknown as Payment);
      await expect(
        service.findOne('p-1', { id: 'admin-1', role: UserRole.ADMIN }),
      ).resolves.toMatchObject({ id: 'p-1' });
    });

    it('forbids a non-owner, non-admin from viewing the payment', async () => {
      repository.findOne.mockResolvedValueOnce({
        id: 'p-1',
        userId: 'someone-else',
      } as unknown as Payment);
      await expect(
        service.findOne('p-1', { id: 'user-1', role: UserRole.USER }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('scopes the query to the current user for non-admins', async () => {
      repository.find.mockResolvedValueOnce([]);
      await service.findAll({ id: 'user-1', role: UserRole.USER });
      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('returns every payment for admins', async () => {
      repository.find.mockResolvedValueOnce([]);
      await service.findAll({ id: 'admin-1', role: UserRole.ADMIN });
      expect(repository.find).toHaveBeenCalledWith();
    });
  });
});
