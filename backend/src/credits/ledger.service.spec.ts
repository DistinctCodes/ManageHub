import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerAccountKind } from './enums/ledger-account-kind.enum';
import { LedgerEntryDirection } from './enums/ledger-entry-direction.enum';
import { LedgerTransactionKind } from './enums/ledger-transaction-kind.enum';
import { createLedgerHarness } from './testing/in-memory-ledger';

function build() {
  const harness = createLedgerHarness();
  const ledger = new LedgerService(
    harness.accounts as any,
    harness.transactions as any,
    harness.entries as any,
  );
  return { harness, ledger };
}

async function twoAccounts(ledger: LedgerService, currency = 'USD') {
  const treasury = await ledger.getOrCreateAccount({
    kind: LedgerAccountKind.TREASURY,
    currency,
  });
  const revenue = await ledger.getOrCreateAccount({
    kind: LedgerAccountKind.REVENUE,
    currency,
  });
  return { treasury, revenue };
}

describe('LedgerService', () => {
  describe('account resolution', () => {
    it('is idempotent for a system account (one per kind per currency)', async () => {
      const { ledger, harness } = build();
      const first = await ledger.getOrCreateAccount({
        kind: LedgerAccountKind.REVENUE,
        currency: 'USD',
      });
      const second = await ledger.getOrCreateAccount({
        kind: LedgerAccountKind.REVENUE,
        currency: 'usd',
      });

      expect(second.id).toBe(first.id);
      expect(harness.accounts.rows).toHaveLength(1);
      expect(first.currency).toBe('USD');
    });

    it('keeps one account per owner per currency', async () => {
      const { ledger, harness } = build();
      await ledger.getOrCreateAccount({
        kind: LedgerAccountKind.USER,
        ownerId: 'user-1',
        currency: 'USD',
      });
      await ledger.getOrCreateAccount({
        kind: LedgerAccountKind.USER,
        ownerId: 'user-1',
        currency: 'EUR',
      });
      await ledger.getOrCreateAccount({
        kind: LedgerAccountKind.USER,
        ownerId: 'user-2',
        currency: 'USD',
      });
      expect(harness.accounts.rows).toHaveLength(3);
    });

    it('recovers the winner when concurrent callers race to create one', async () => {
      const { ledger, harness } = build();
      const accounts = await Promise.all(
        Array.from({ length: 5 }, () =>
          ledger.getOrCreateAccount({
            kind: LedgerAccountKind.USER,
            ownerId: 'user-1',
            currency: 'USD',
          }),
        ),
      );

      expect(new Set(accounts.map((account) => account.id)).size).toBe(1);
      expect(harness.accounts.rows).toHaveLength(1);
    });

    it('never lets an account policy update touch the balance', async () => {
      const { ledger } = build();
      const account = await ledger.getOrCreateAccount({
        kind: LedgerAccountKind.USER,
        ownerId: 'user-1',
        currency: 'USD',
      });

      const updated = await ledger.updateAccountPolicy(account.id, {
        overdraftLimit: 250,
        externalPayoutAddress: 'GADDRESS',
        frozen: true,
      } as any);

      expect(updated).toMatchObject({
        overdraftLimit: 250,
        externalPayoutAddress: 'GADDRESS',
        frozen: true,
        balance: 0,
      });
    });

    it('rejects a negative overdraft limit', async () => {
      const { ledger } = build();
      const account = await ledger.getOrCreateAccount({
        kind: LedgerAccountKind.USER,
        ownerId: 'user-1',
        currency: 'USD',
      });
      await expect(
        ledger.updateAccountPolicy(account.id, { overdraftLimit: -1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('posting a transaction', () => {
    it('moves both sides and keeps the currency’s balances summing to zero', async () => {
      const { ledger, harness } = build();
      const { treasury, revenue } = await twoAccounts(ledger);

      const { posted } = await ledger.post({
        reference: 'movement-1',
        kind: LedgerTransactionKind.CHARGE,
        currency: 'USD',
        legs: [
          {
            accountId: treasury.id,
            direction: LedgerEntryDirection.DEBIT,
            amount: 700,
          },
          {
            accountId: revenue.id,
            direction: LedgerEntryDirection.CREDIT,
            amount: 700,
          },
        ],
      });

      expect(posted).toBe(true);
      expect(harness.balanceOf(treasury.id)).toBe(-700);
      expect(harness.balanceOf(revenue.id)).toBe(700);
      expect(
        harness.balanceOf(treasury.id) + harness.balanceOf(revenue.id),
      ).toBe(0);
    });

    it('rejects legs that do not balance', async () => {
      const { ledger } = build();
      const { treasury, revenue } = await twoAccounts(ledger);

      await expect(
        ledger.post({
          reference: 'lopsided',
          kind: LedgerTransactionKind.CHARGE,
          currency: 'USD',
          legs: [
            {
              accountId: treasury.id,
              direction: LedgerEntryDirection.DEBIT,
              amount: 700,
            },
            {
              accountId: revenue.id,
              direction: LedgerEntryDirection.CREDIT,
              amount: 300,
            },
          ],
        }),
      ).rejects.toThrow(/does not balance/);
    });

    it('rejects a single-sided, zero, negative or fractional transaction', async () => {
      const { ledger } = build();
      const { treasury, revenue } = await twoAccounts(ledger);
      const leg = (amount: number, direction: LedgerEntryDirection) => ({
        accountId:
          direction === LedgerEntryDirection.DEBIT ? treasury.id : revenue.id,
        direction,
        amount,
      });

      await expect(
        ledger.post({
          reference: 'one-sided',
          kind: LedgerTransactionKind.CHARGE,
          currency: 'USD',
          legs: [leg(100, LedgerEntryDirection.DEBIT)],
        }),
      ).rejects.toThrow(/at least one debit and one credit/);

      for (const amount of [0, -100, 10.5]) {
        await expect(
          ledger.post({
            reference: `bad-${amount}`,
            kind: LedgerTransactionKind.CHARGE,
            currency: 'USD',
            legs: [
              leg(amount, LedgerEntryDirection.DEBIT),
              leg(amount, LedgerEntryDirection.CREDIT),
            ],
          }),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('rejects a leg against an account in another currency', async () => {
      const { ledger } = build();
      const { treasury } = await twoAccounts(ledger, 'USD');
      const euroRevenue = await ledger.getOrCreateAccount({
        kind: LedgerAccountKind.REVENUE,
        currency: 'EUR',
      });

      await expect(
        ledger.post({
          reference: 'mixed-currency',
          kind: LedgerTransactionKind.CHARGE,
          currency: 'USD',
          legs: [
            {
              accountId: treasury.id,
              direction: LedgerEntryDirection.DEBIT,
              amount: 100,
            },
            {
              accountId: euroRevenue.id,
              direction: LedgerEntryDirection.CREDIT,
              amount: 100,
            },
          ],
        }),
      ).rejects.toThrow(/is in EUR/);
    });

    it('rejects a reference that is missing or blank', async () => {
      const { ledger } = build();
      const { treasury, revenue } = await twoAccounts(ledger);
      await expect(
        ledger.post({
          reference: '   ',
          kind: LedgerTransactionKind.CHARGE,
          currency: 'USD',
          legs: [
            {
              accountId: treasury.id,
              direction: LedgerEntryDirection.DEBIT,
              amount: 100,
            },
            {
              accountId: revenue.id,
              direction: LedgerEntryDirection.CREDIT,
              amount: 100,
            },
          ],
        }),
      ).rejects.toThrow(/reference is required/);
    });

    it('rejects a leg against an account that does not exist', async () => {
      const { ledger } = build();
      const { treasury } = await twoAccounts(ledger);
      await expect(
        ledger.post({
          reference: 'ghost',
          kind: LedgerTransactionKind.CHARGE,
          currency: 'USD',
          legs: [
            {
              accountId: treasury.id,
              direction: LedgerEntryDirection.DEBIT,
              amount: 100,
            },
            {
              accountId: 'does-not-exist',
              direction: LedgerEntryDirection.CREDIT,
              amount: 100,
            },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('supports a multi-leg transaction, as a revenue split needs', async () => {
      const { ledger, harness } = build();
      const { treasury } = await twoAccounts(ledger);
      const platform = await ledger.getOrCreateAccount({
        kind: LedgerAccountKind.PLATFORM_FEE,
        currency: 'USD',
      });
      const operator = await ledger.getOrCreateAccount({
        kind: LedgerAccountKind.HUB_OPERATOR,
        ownerId: 'hub-1',
        currency: 'USD',
      });

      await ledger.post({
        reference: 'split-1',
        kind: LedgerTransactionKind.REVENUE_SPLIT,
        currency: 'USD',
        legs: [
          {
            accountId: treasury.id,
            direction: LedgerEntryDirection.DEBIT,
            amount: 1000,
          },
          {
            accountId: platform.id,
            direction: LedgerEntryDirection.CREDIT,
            amount: 150,
          },
          {
            accountId: operator.id,
            direction: LedgerEntryDirection.CREDIT,
            amount: 850,
          },
        ],
      });

      expect(harness.balanceOf(platform.id)).toBe(150);
      expect(harness.balanceOf(operator.id)).toBe(850);
      expect(harness.balanceOf(treasury.id)).toBe(-1000);
    });

    it('nets legs that touch the same account twice', async () => {
      const { ledger, harness } = build();
      const { treasury, revenue } = await twoAccounts(ledger);

      await ledger.post({
        reference: 'self-netting',
        kind: LedgerTransactionKind.ADJUSTMENT,
        currency: 'USD',
        legs: [
          {
            accountId: treasury.id,
            direction: LedgerEntryDirection.DEBIT,
            amount: 500,
          },
          {
            accountId: revenue.id,
            direction: LedgerEntryDirection.CREDIT,
            amount: 500,
          },
          {
            accountId: revenue.id,
            direction: LedgerEntryDirection.DEBIT,
            amount: 200,
          },
          {
            accountId: treasury.id,
            direction: LedgerEntryDirection.CREDIT,
            amount: 200,
          },
        ],
      });

      expect(harness.balanceOf(revenue.id)).toBe(300);
      expect(harness.balanceOf(treasury.id)).toBe(-300);
      expect(harness.balanceOf(revenue.id)).toBe(
        harness.derivedBalanceOf(revenue.id),
      );
    });

    it('writes nothing on a replay, and reports posted: false', async () => {
      const { ledger, harness } = build();
      const { treasury, revenue } = await twoAccounts(ledger);
      const legs = [
        {
          accountId: treasury.id,
          direction: LedgerEntryDirection.DEBIT,
          amount: 100,
        },
        {
          accountId: revenue.id,
          direction: LedgerEntryDirection.CREDIT,
          amount: 100,
        },
      ];

      const first = await ledger.post({
        reference: 'replayed',
        kind: LedgerTransactionKind.CHARGE,
        currency: 'USD',
        legs,
      });
      const second = await ledger.post({
        reference: 'replayed',
        kind: LedgerTransactionKind.CHARGE,
        currency: 'USD',
        legs,
      });

      expect(first.posted).toBe(true);
      expect(second.posted).toBe(false);
      expect(second.transaction.id).toBe(first.transaction.id);
      expect(harness.entries.rows).toHaveLength(2);
      expect(harness.balanceOf(revenue.id)).toBe(100);
    });

    it('trims the reference so a padded replay still collides', async () => {
      const { ledger } = build();
      const { treasury, revenue } = await twoAccounts(ledger);
      const legs = [
        {
          accountId: treasury.id,
          direction: LedgerEntryDirection.DEBIT,
          amount: 100,
        },
        {
          accountId: revenue.id,
          direction: LedgerEntryDirection.CREDIT,
          amount: 100,
        },
      ];

      await ledger.post({
        reference: 'padded',
        kind: LedgerTransactionKind.CHARGE,
        currency: 'USD',
        legs,
      });
      const replay = await ledger.post({
        reference: '  padded  ',
        kind: LedgerTransactionKind.CHARGE,
        currency: 'USD',
        legs,
      });
      expect(replay.posted).toBe(false);
    });
  });
});
