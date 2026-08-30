import {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreditsService } from './credits.service';
import { LedgerService } from './ledger.service';
import { RevenueSplitService } from './revenue-split.service';
import { LedgerAccountKind } from './enums/ledger-account-kind.enum';
import { LedgerEntryDirection } from './enums/ledger-entry-direction.enum';
import { LedgerTransactionKind } from './enums/ledger-transaction-kind.enum';
import {
  createLedgerHarness,
  fakeConfigService,
} from './testing/in-memory-ledger';

async function build() {
  const harness = createLedgerHarness();
  const ledger = new LedgerService(
    harness.accounts as any,
    harness.transactions as any,
    harness.entries as any,
  );
  const credits = new CreditsService(
    ledger,
    fakeConfigService({ CREDITS_DEFAULT_CURRENCY: 'USD' }),
  );
  const splits = new RevenueSplitService(
    harness.splitConfigs as any,
    harness.splitRecipients as any,
    ledger,
  );

  const platform = await credits.getSystemAccount(
    LedgerAccountKind.PLATFORM_FEE,
  );
  const operator = await credits.getPayableAccount(
    LedgerAccountKind.HUB_OPERATOR,
    'hub-1',
    'USD',
    'GOPERATOR',
  );
  const referrer = await credits.getPayableAccount(
    LedgerAccountKind.REFERRAL,
    'referrer-1',
    'USD',
    'GREFERRER',
  );

  return { harness, ledger, credits, splits, platform, operator, referrer };
}

describe('RevenueSplitService', () => {
  describe('configuration-time validation', () => {
    it('accepts a config whose shares sum to exactly 10000', async () => {
      const { splits, platform, operator } = await build();
      const config = await splits.createConfig({
        name: 'standard',
        recipients: [
          { label: 'platform fee', basisPoints: 1500, accountId: platform.id },
          { label: 'hub operator', basisPoints: 8500, accountId: operator.id },
        ],
      });

      expect(config.recipients).toHaveLength(2);
      expect(config.recipients.reduce((sum, r) => sum + r.basisPoints, 0)).toBe(
        10000,
      );
    });

    /**
     * The edge case the issue calls out by name: a config error must be a
     * 400 on the request that introduced it, never something a settlement
     * run discovers halfway through distributing money.
     */
    it('rejects shares that do not sum to 10000, at configuration time', async () => {
      const { splits, platform, operator } = await build();
      await expect(
        splits.createConfig({
          name: 'short',
          recipients: [
            {
              label: 'platform fee',
              basisPoints: 1500,
              accountId: platform.id,
            },
            {
              label: 'hub operator',
              basisPoints: 8000,
              accountId: operator.id,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        splits.createConfig({
          name: 'over',
          recipients: [
            {
              label: 'platform fee',
              basisPoints: 5000,
              accountId: platform.id,
            },
            {
              label: 'hub operator',
              basisPoints: 6000,
              accountId: operator.id,
            },
          ],
        }),
      ).rejects.toThrow(/must sum to 10000/);
    });

    it('rejects a recipient that is neither internal nor external', async () => {
      const { splits } = await build();
      await expect(
        splits.createConfig({
          name: 'targetless',
          recipients: [{ label: 'nowhere', basisPoints: 10000 }],
        }),
      ).rejects.toThrow(/exactly one of accountId/);
    });

    it('rejects a recipient that is both internal and external', async () => {
      const { splits, platform } = await build();
      await expect(
        splits.createConfig({
          name: 'both',
          recipients: [
            {
              label: 'ambiguous',
              basisPoints: 10000,
              accountId: platform.id,
              externalAddress: 'GSOMEWHERE',
            },
          ],
        }),
      ).rejects.toThrow(/exactly one of accountId/);
    });

    it('rejects a recipient pointing at an account that does not exist', async () => {
      const { splits } = await build();
      await expect(
        splits.createConfig({
          name: 'ghost-account',
          recipients: [
            {
              label: 'ghost',
              basisPoints: 10000,
              accountId: '00000000-0000-0000-0000-000000000000',
            },
          ],
        }),
      ).rejects.toThrow(/not found/);
    });

    it('rejects a duplicate config name', async () => {
      const { splits, platform } = await build();
      const recipients = [
        { label: 'platform fee', basisPoints: 10000, accountId: platform.id },
      ];
      await splits.createConfig({ name: 'dupe', recipients });
      await expect(
        splits.createConfig({ name: 'dupe', recipients }),
      ).rejects.toThrow(ConflictException);
    });

    it('validates replacement recipients as a set', async () => {
      const { splits, platform, operator } = await build();
      const config = await splits.createConfig({
        name: 'replaceable',
        recipients: [
          { label: 'platform fee', basisPoints: 10000, accountId: platform.id },
        ],
      });

      await expect(
        splits.replaceRecipients(config.id, [
          { label: 'platform fee', basisPoints: 2000, accountId: platform.id },
        ]),
      ).rejects.toThrow(BadRequestException);

      const updated = await splits.replaceRecipients(config.id, [
        { label: 'platform fee', basisPoints: 2000, accountId: platform.id },
        { label: 'hub operator', basisPoints: 8000, accountId: operator.id },
      ]);
      expect(updated.recipients).toHaveLength(2);
    });

    /**
     * Issue #1700: every recipient here individually passes
     * `RevenueSplitRecipientDto`'s per-field `@Min(1) @Max(10000)` check —
     * the only thing wrong is the *set's* total. Proves the update path
     * (`replaceRecipients`, backing `PUT .../recipients`) rejects that atomically
     * — before the existing recipients are ever deleted, not after.
     */
    it('rejects an update whose individually-valid recipients do not sum to 10000, without touching existing rows', async () => {
      const { splits, platform, operator } = await build();
      const config = await splits.createConfig({
        name: 'update-sum-check',
        recipients: [
          { label: 'platform fee', basisPoints: 4000, accountId: platform.id },
          { label: 'hub operator', basisPoints: 6000, accountId: operator.id },
        ],
      });

      // 9999: one short of 10000, every individual value still 1-10000.
      await expect(
        splits.replaceRecipients(config.id, [
          { label: 'platform fee', basisPoints: 4999, accountId: platform.id },
          { label: 'hub operator', basisPoints: 5000, accountId: operator.id },
        ]),
      ).rejects.toThrow(/must sum to 10000/);

      // 10001: one over, same individual-field validity.
      await expect(
        splits.replaceRecipients(config.id, [
          { label: 'platform fee', basisPoints: 5001, accountId: platform.id },
          { label: 'hub operator', basisPoints: 5000, accountId: operator.id },
        ]),
      ).rejects.toThrow(/must sum to 10000/);

      // Neither rejected update was partially applied: the original
      // recipients (and only them) are still in place.
      const unchanged = await splits.getConfig(config.id);
      expect(unchanged.recipients).toHaveLength(2);
      expect(
        unchanged.recipients.map((r) => [r.label, r.basisPoints]),
      ).toEqual(
        expect.arrayContaining([
          ['platform fee', 4000],
          ['hub operator', 6000],
        ]),
      );
    });
  });

  describe('computation', () => {
    it('allocates an amount across recipients with nothing lost', async () => {
      const { splits, platform, operator, referrer } = await build();
      const config = await splits.createConfig({
        name: 'three-way',
        recipients: [
          { label: 'platform fee', basisPoints: 3333, accountId: platform.id },
          { label: 'hub operator', basisPoints: 3333, accountId: operator.id },
          { label: 'referral', basisPoints: 3334, accountId: referrer.id },
        ],
      });

      for (const amount of [0, 1, 7, 1000, 99_999]) {
        const shares = await splits.computeForAmount(config.id, amount);
        expect(shares.reduce((sum, share) => sum + share.amount, 0)).toBe(
          amount,
        );
      }
    });

    it('refuses to compute with an inactive config', async () => {
      const { splits, platform } = await build();
      const config = await splits.createConfig({
        name: 'retired',
        recipients: [
          { label: 'platform fee', basisPoints: 10000, accountId: platform.id },
        ],
      });
      await splits.setActive(config.id, false);

      await expect(splits.computeForAmount(config.id, 1000)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('distributing a confirmed payment', () => {
    it('debits treasury and credits every recipient, balancing exactly', async () => {
      const { splits, credits, harness, platform, operator } = await build();
      const config = await splits.createConfig({
        name: 'payment-split',
        recipients: [
          { label: 'platform fee', basisPoints: 1500, accountId: platform.id },
          { label: 'hub operator', basisPoints: 8500, accountId: operator.id },
        ],
      });

      const { transaction, shares } = await splits.distributePayment({
        paymentId: 'payment-1',
        configId: config.id,
        amount: 10_001,
        currency: 'USD',
      });

      expect(transaction.kind).toBe(LedgerTransactionKind.REVENUE_SPLIT);
      expect(shares.reduce((sum, share) => sum + share.amount, 0)).toBe(10_001);

      const treasury = await credits.getSystemAccount(
        LedgerAccountKind.TREASURY,
      );
      expect(harness.balanceOf(treasury.id)).toBe(-10_001);
      expect(
        harness.balanceOf(platform.id) + harness.balanceOf(operator.id),
      ).toBe(10_001);

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

    it('distributes a payment only once', async () => {
      const { splits, platform } = await build();
      const config = await splits.createConfig({
        name: 'once',
        recipients: [
          { label: 'platform fee', basisPoints: 10000, accountId: platform.id },
        ],
      });

      const first = await splits.distributePayment({
        paymentId: 'payment-2',
        configId: config.id,
        amount: 500,
        currency: 'USD',
      });
      const second = await splits.distributePayment({
        paymentId: 'payment-2',
        configId: config.id,
        amount: 500,
        currency: 'USD',
      });

      expect(first.posted).toBe(true);
      expect(second.posted).toBe(false);
      expect(second.transaction.id).toBe(first.transaction.id);
    });

    /**
     * A share that rounds to zero must post no leg at all — a zero-amount
     * entry would be refused by the ledger, and the remaining legs still
     * add up to the full amount.
     */
    it('omits zero shares while still balancing to the full amount', async () => {
      const { splits, harness, platform, operator, referrer } = await build();
      const config = await splits.createConfig({
        name: 'tiny',
        recipients: [
          { label: 'platform fee', basisPoints: 9998, accountId: platform.id },
          { label: 'hub operator', basisPoints: 1, accountId: operator.id },
          { label: 'referral', basisPoints: 1, accountId: referrer.id },
        ],
      });

      const { transaction, shares } = await splits.distributePayment({
        paymentId: 'payment-3',
        configId: config.id,
        amount: 1,
        currency: 'USD',
      });

      expect(shares.reduce((sum, share) => sum + share.amount, 0)).toBe(1);
      const legs = harness.entries.rows.filter(
        (entry) => entry.transactionId === transaction.id,
      );
      expect(legs).toHaveLength(2);
      expect(legs.every((leg) => leg.amount > 0)).toBe(true);
    });

    it('refuses a config with external-address recipients', async () => {
      const { splits, platform } = await build();
      const config = await splits.createConfig({
        name: 'external-heavy',
        recipients: [
          { label: 'platform fee', basisPoints: 5000, accountId: platform.id },
          {
            label: 'partner',
            basisPoints: 5000,
            externalAddress: 'GPARTNERADDRESS',
          },
        ],
      });

      await expect(
        splits.distributePayment({
          paymentId: 'payment-4',
          configId: config.id,
          amount: 1000,
          currency: 'USD',
        }),
      ).rejects.toThrow(/payment split cannot post internally/);
    });

    it('refuses an inactive config', async () => {
      const { splits, platform } = await build();
      const config = await splits.createConfig({
        name: 'inactive-payment-split',
        recipients: [
          { label: 'platform fee', basisPoints: 10000, accountId: platform.id },
        ],
      });
      await splits.setActive(config.id, false);

      await expect(
        splits.distributePayment({
          paymentId: 'payment-5',
          configId: config.id,
          amount: 1000,
          currency: 'USD',
        }),
      ).rejects.toThrow(/inactive/);
    });
  });
});
