import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { InsufficientCreditException, LedgerService } from './ledger.service';
import { LedgerAccountKind } from './enums/ledger-account-kind.enum';
import { LedgerEntryDirection } from './enums/ledger-entry-direction.enum';
import { LedgerTransactionKind } from './enums/ledger-transaction-kind.enum';
import {
  createLedgerHarness,
  fakeConfigService,
  LedgerHarness,
} from './testing/in-memory-ledger';

function build(config: Record<string, unknown> = {}) {
  const harness = createLedgerHarness();
  const ledger = new LedgerService(
    harness.accounts as any,
    harness.transactions as any,
    harness.entries as any,
  );
  const credits = new CreditsService(
    ledger,
    fakeConfigService({
      CREDITS_DEFAULT_CURRENCY: 'USD',
      CREDITS_DEFAULT_OVERDRAFT_LIMIT: 0,
      ...config,
    }),
  );
  return { harness, ledger, credits };
}

async function fund(
  credits: CreditsService,
  userId: string,
  amount: number,
  paymentId = `payment-${userId}`,
): Promise<void> {
  await credits.topUpFromPayment({
    paymentId,
    userId,
    amount,
    currency: 'USD',
  });
}

 const harness = createLedgerHarness();
  const ledger = new LedgerService(
    harness.accounts as any,
    harness.transactions as any,
    harness.entries as any,
  );
  const credits = new CreditsService(
    ledger,
    fakeConfigService({
      CREDITS_DEFAULT_CURRENCY: 'USD',
      CREDITS_DEFAULT_OVERDRAFT_LIMIT: 0,
      ...config,
    }),
  );
  return { harness, ledger, credits };
}


function assertLedgerBalances(harness: LedgerHarness, accountIds: string[]) {
  for (const accountId of accountIds) {
    expect(harness.balanceOf(accountId)).toBe(
      harness.derivedBalanceOf(accountId),
    );
  }
}

describe('CreditsService', () => {
  describe('top-up path', () => {
    it('credits the member and debits treasury, balancing to zero', async () => {
      const { credits, harness } = build();
      await fund(credits, 'user-1', 5000);

      const balance = await credits.getBalance('user-1');
      expect(balance.balance).toBe(5000);
      expect(balance.spendable).toBe(5000);

      const treasury = await credits.getSystemAccount(
        LedgerAccountKind.TREASURY,
      );
      expect(harness.balanceOf(treasury.id)).toBe(-5000);
      assertLedgerBalances(harness, [balance.accountId!, treasury.id]);
    });

    it('credits a payment only once, however often it is applied', async () => {
      const { credits, harness } = build();
      const first = await credits.topUpFromPayment({
        paymentId: 'payment-9',
        userId: 'user-1',
        amount: 2500,
        currency: 'USD',
      });
      const second = await credits.topUpFromPayment({
        paymentId: 'payment-9',
        userId: 'user-1',
        amount: 2500,
        currency: 'USD',
      });

      expect(first.posted).toBe(true);
      expect(second.posted).toBe(false);
      expect(second.transaction.id).toBe(first.transaction.id);
      expect((await credits.getBalance('user-1')).balance).toBe(2500);
      expect(harness.transactions.rows).toHaveLength(1);
    });

    it('reports a zero balance for a member with no account yet', async () => {
      const { credits } = build();
      const balance = await credits.getBalance('nobody');
      expect(balance).toMatchObject({
        accountId: null,
        balance: 0,
        spendable: 0,
      });
    });
  });

  describe('charge path', () => {
    it('debits the member and credits revenue', async () => {
      const { credits, harness } = build();
      await fund(credits, 'user-1', 1000);

      const result = await credits.charge({
        userId: 'user-1',
        amount: 250,
        reference: 'print-job-1',
        reason: 'printing x50',
      });

      expect(result.posted).toBe(true);
      expect(result.balanceAfter).toBe(750);
      expect(result.transaction.kind).toBe(LedgerTransactionKind.CHARGE);
      expect(result.transaction.reference).toBe('charge:print-job-1');

      const revenue = await credits.getSystemAccount(LedgerAccountKind.REVENUE);
      expect(harness.balanceOf(revenue.id)).toBe(250);

      const legs = harness.entries.rows.filter(
        (entry) => entry.transactionId === result.transaction.id,
      );
      expect(legs).toHaveLength(2);
      expect(
        legs.filter((leg) => leg.direction === LedgerEntryDirection.DEBIT)[0]
          .amount,
      ).toBe(250);
    });

    it('charges a replayed reference exactly once', async () => {
      const { credits } = build();
      await fund(credits, 'user-1', 1000);

      const first = await credits.charge({
        userId: 'user-1',
        amount: 250,
        reference: 'session-42',
        reason: 'resource minutes',
      });
      const replay = await credits.charge({
        userId: 'user-1',
        amount: 250,
        reference: 'session-42',
        reason: 'resource minutes',
      });

      expect(first.posted).toBe(true);
      expect(replay.posted).toBe(false);
      expect(replay.transaction.id).toBe(first.transaction.id);
      expect((await credits.getBalance('user-1')).balance).toBe(750);
    });

    it('rejects a charge that would overdraw an account with no ceiling', async () => {
      const { credits } = build();
      await fund(credits, 'user-1', 100);

      await expect(
        credits.charge({
          userId: 'user-1',
          amount: 101,
          reference: 'too-big',
          reason: 'overage',
        }),
      ).rejects.toThrow(InsufficientCreditException);
      expect((await credits.getBalance('user-1')).balance).toBe(100);
    });

    it('allows a charge inside a configured overdraft ceiling, and not past it', async () => {
      const { credits, ledger } = build();
      await fund(credits, 'user-1', 100);
      const account = await credits.getUserAccount('user-1');
      await ledger.updateAccountPolicy(account.id, { overdraftLimit: 500 });

      await credits.charge({
        userId: 'user-1',
        amount: 600,
        reference: 'within-ceiling',
        reason: 'graceful degradation',
      });
      expect((await credits.getBalance('user-1')).balance).toBe(-500);

      await expect(
        credits.charge({
          userId: 'user-1',
          amount: 1,
          reference: 'past-ceiling',
          reason: 'one too many',
        }),
      ).rejects.toThrow(InsufficientCreditException);
      expect((await credits.getBalance('user-1')).balance).toBe(-500);
    });

    it('refuses to debit a frozen account', async () => {
      const { credits, ledger } = build();
      await fund(credits, 'user-1', 1000);
      const account = await credits.getUserAccount('user-1');
      await ledger.updateAccountPolicy(account.id, { frozen: true });

      await expect(
        credits.charge({
          userId: 'user-1',
          amount: 10,
          reference: 'frozen',
          reason: 'nope',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a non-positive or fractional amount', async () => {
      const { credits } = build();
      for (const amount of [0, -5, 1.5]) {
        await expect(
          credits.charge({
            userId: 'user-1',
            amount,
            reference: `bad-${amount}`,
            reason: 'bad amount',
          }),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('requires a reason and a reference', async () => {
      const { credits } = build();
      await expect(
        credits.charge({
          userId: 'user-1',
          amount: 10,
          reference: 'has-ref',
          reason: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        credits.charge({
          userId: 'user-1',
          amount: 10,
          reference: '',
          reason: 'has reason',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /**
   * Issue #1575's concurrency acceptance criterion. The harness serializes
   * transactions exactly as the accounts' `FOR UPDATE` locks do, so each
   * charge evaluates the overdraft rule against the balance the previous
   * one committed — which is the difference between "each charge is
   * individually affordable" and "all of them are affordable together".
   */
  describe('concurrent charges against one balance', () => {
    it('never overdraws past a zero ceiling, whoever wins the race', async () => {
      const { credits, harness } = build();
      await fund(credits, 'user-1', 1000);

      const results = await Promise.allSettled(
        Array.from({ length: 25 }, (_, index) =>
          credits.charge({
            userId: 'user-1',
            amount: 100,
            reference: `concurrent-${index}`,
            reason: 'per-minute usage',
          }),
        ),
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );

      // 1000 / 100 — exactly ten charges are affordable, no more, no fewer.
      expect(succeeded).toHaveLength(10);
      expect(rejected).toHaveLength(15);
      expect(
        rejected.every((r) => r.reason instanceof InsufficientCreditException),
      ).toBe(true);

      const balance = await credits.getBalance('user-1');
      expect(balance.balance).toBe(0);

      // Nothing was lost or double-applied: the materialized balance still
      // agrees with the append-only entries it is a cache of.
      const revenue = await credits.getSystemAccount(LedgerAccountKind.REVENUE);
      assertLedgerBalances(harness, [balance.accountId!, revenue.id]);
      expect(harness.balanceOf(revenue.id)).toBe(1000);
    });

    it('overdraws to exactly the ceiling and no further', async () => {
      const { credits, ledger, harness } = build();
      await fund(credits, 'user-1', 500);
      const account = await credits.getUserAccount('user-1');
      await ledger.updateAccountPolicy(account.id, { overdraftLimit: 200 });

      const results = await Promise.allSettled(
        Array.from({ length: 20 }, (_, index) =>
          credits.charge({
            userId: 'user-1',
            amount: 100,
            reference: `ceiling-${index}`,
            reason: 'per-minute usage',
          }),
        ),
      );

      // 500 of balance + 200 of ceiling = 7 affordable charges of 100.
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(7);
      expect(harness.balanceOf(account.id)).toBe(-200);
      assertLedgerBalances(harness, [account.id]);
    });

    it('applies a replayed reference once even when replays race', async () => {
      const { credits } = build();
      await fund(credits, 'user-1', 1000);

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          credits.charge({
            userId: 'user-1',
            amount: 100,
            reference: 'same-usage-event',
            reason: 'duplicate delivery',
          }),
        ),
      );

      expect(results.filter((result) => result.posted)).toHaveLength(1);
      expect(new Set(results.map((r) => r.transaction.id)).size).toBe(1);
      expect((await credits.getBalance('user-1')).balance).toBe(900);
    });
  });

  describe('adjustments', () => {
    it('credits a member with a balanced ADJUSTMENT transaction', async () => {
      const { credits, harness } = build();
      const { transaction } = await credits.adjust({
        userId: 'user-1',
        delta: 750,
        reference: 'goodwill-1',
        reason: 'goodwill credit',
        actorId: 'admin-1',
      });

      expect(transaction.kind).toBe(LedgerTransactionKind.ADJUSTMENT);
      expect(transaction.actorId).toBe('admin-1');
      expect((await credits.getBalance('user-1')).balance).toBe(750);

      const legs = harness.entries.rows.filter(
        (entry) => entry.transactionId === transaction.id,
      );
      const debits = legs
        .filter((leg) => leg.direction === LedgerEntryDirection.DEBIT)
        .reduce((sum, leg) => sum + leg.amount, 0);
      const creditsTotal = legs
        .filter((leg) => leg.direction === LedgerEntryDirection.CREDIT)
        .reduce((sum, leg) => sum + leg.amount, 0);
      expect(debits).toBe(creditsTotal);
    });

    it('debits a member for a negative delta, honouring the overdraft rule', async () => {
      const { credits } = build();
      await fund(credits, 'user-1', 300);

      await credits.adjust({
        userId: 'user-1',
        delta: -100,
        reference: 'correction-1',
        reason: 'mis-charged usage',
        actorId: 'admin-1',
      });
      expect((await credits.getBalance('user-1')).balance).toBe(200);

      await expect(
        credits.adjust({
          userId: 'user-1',
          delta: -1000,
          reference: 'correction-2',
          reason: 'too big',
          actorId: 'admin-1',
        }),
      ).rejects.toThrow(InsufficientCreditException);
    });

    it('rejects a zero delta and a missing reason', async () => {
      const { credits } = build();
      await expect(
        credits.adjust({
          userId: 'user-1',
          delta: 0,
          reference: 'zero',
          reason: 'nothing',
          actorId: 'admin-1',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        credits.adjust({
          userId: 'user-1',
          delta: 100,
          reference: 'no-reason',
          reason: '',
          actorId: 'admin-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
