import { UnprocessableEntityException } from '@nestjs/common';
import { assertValidTransition, canTransition } from './payment-state-machine';
import { PaymentStatus } from './enums/payment-status.enum';

describe('payment state machine', () => {
  const ALL_STATUSES = Object.values(PaymentStatus);

  const VALID_TRANSITIONS: [PaymentStatus, PaymentStatus][] = [
    [PaymentStatus.INITIATED, PaymentStatus.AWAITING_CONFIRMATION],
    [PaymentStatus.INITIATED, PaymentStatus.FAILED],
    [PaymentStatus.INITIATED, PaymentStatus.EXPIRED],
    [PaymentStatus.AWAITING_CONFIRMATION, PaymentStatus.CONFIRMED],
    [PaymentStatus.AWAITING_CONFIRMATION, PaymentStatus.FAILED],
    [PaymentStatus.AWAITING_CONFIRMATION, PaymentStatus.EXPIRED],
    [PaymentStatus.CONFIRMED, PaymentStatus.REFUNDED],
    [PaymentStatus.CONFIRMED, PaymentStatus.PARTIALLY_REFUNDED],
  ];

  it.each(VALID_TRANSITIONS)('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertValidTransition(from, to)).not.toThrow();
  });

  const validSet = new Set(
    VALID_TRANSITIONS.map(([from, to]) => `${from}->${to}`),
  );

  const illegalTransitions = ALL_STATUSES.flatMap((from) =>
    ALL_STATUSES.filter((to) => !validSet.has(`${from}->${to}`)).map(
      (to): [PaymentStatus, PaymentStatus] => [from, to],
    ),
  );

  it.each(illegalTransitions)('rejects %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertValidTransition(from, to)).toThrow(
      UnprocessableEntityException,
    );
  });

  it('has no outgoing transitions from any terminal status', () => {
    const terminal = [
      PaymentStatus.FAILED,
      PaymentStatus.EXPIRED,
      PaymentStatus.REFUNDED,
      PaymentStatus.PARTIALLY_REFUNDED,
    ];
    for (const status of terminal) {
      for (const to of ALL_STATUSES) {
        expect(canTransition(status, to)).toBe(false);
      }
    }
  });
});
