import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerTransaction } from './entities/ledger-transaction.entity';
import { LedgerAccountKind } from './enums/ledger-account-kind.enum';
import { LedgerEntryDirection } from './enums/ledger-entry-direction.enum';
import { LedgerTransactionKind } from './enums/ledger-transaction-kind.enum';
import { LedgerService } from './ledger.service';

export interface ChargeCreditsInput {
  userId: string;
  /** Minor units, positive. */
  amount: number;
  currency?: string;
  /**
   * The caller's own natural key for the thing being charged (a usage
   * event id, a print job id). Made unique per charge by the `charge:`
   * prefix below — a retried delivery charges exactly once.
   */
  reference: string;
  reason: string;
  metadata?: Record<string, unknown> | null;
  actorId?: string | null;
}

export interface ChargeCreditsResult {
  transaction: LedgerTransaction;
  /** False when this reference had already been charged. */
  posted: boolean;
  balanceAfter: number;
  currency: string;
}

export interface CreditBalanceView {
  accountId: string | null;
  userId: string;
  currency: string;
  balance: number;
  overdraftLimit: number;
  /** balance + overdraftLimit — what a charge may actually consume. */
  spendable: number;
  frozen: boolean;
}

/**
 * The credit-balance domain API (issue #1575): the spend path, the top-up
 * path, and the account resolution both need.
 *
 * Why this exists at all: per-minute resource usage, printing and
 * meeting-room overage are too small and too frequent to settle on-chain
 * per event — the fee and the latency would dwarf the charge. So a charge
 * here is a synchronous, cheap, purely-internal ledger movement with no
 * blockchain call anywhere in the hot path; value only crosses the
 * platform boundary later, in one netted batch (see SettlementService).
 *
 * ## Overdraft policy
 *
 * A charge is refused the moment it would take the account below
 * `-overdraftLimit`, which defaults to 0 (`CREDITS_DEFAULT_OVERDRAFT_LIMIT`)
 * — i.e. no overdraft at all unless an operator deliberately grants a
 * ceiling for graceful degradation. The check happens inside the same
 * transaction that holds the account's row lock, so two concurrent charges
 * that are each individually affordable but not affordable together can
 * never both succeed: one wins, the other gets a 409.
 */
@Injectable()
export class CreditsService {
  constructor(
    private readonly ledger: LedgerService,
    private readonly config: ConfigService,
  ) {}

  defaultCurrency(): string {
    return this.config
      .get<string>('CREDITS_DEFAULT_CURRENCY', 'USD')
      .toUpperCase();
  }

  /**
   * Resolves (creating on first use) a member's credit account. The
   * overdraft ceiling is seeded from config at creation time and can be
   * raised per account afterwards by an admin — it is not re-read from
   * config on every charge, so changing the default never silently
   * re-authorizes an existing account.
   */
  async getUserAccount(
    userId: string,
    currency?: string,
    manager?: EntityManager,
  ): Promise<LedgerAccount> {
    return this.ledger.getOrCreateAccount(
      {
        kind: LedgerAccountKind.USER,
        ownerId: userId,
        currency: currency ?? this.defaultCurrency(),
        overdraftLimit: this.config.get<number>(
          'CREDITS_DEFAULT_OVERDRAFT_LIMIT',
          0,
        ),
        label: `user credit balance`,
      },
      manager,
    );
  }

  /** Resolves (creating on first use) one of the singleton system accounts. */
  async getSystemAccount(
    kind: LedgerAccountKind,
    currency?: string,
    manager?: EntityManager,
  ): Promise<LedgerAccount> {
    if (kind === LedgerAccountKind.USER) {
      throw new BadRequestException(
        'USER accounts are owned, not system accounts',
      );
    }
    return this.ledger.getOrCreateAccount(
      {
        kind,
        ownerId: null,
        currency: currency ?? this.defaultCurrency(),
        label: kind.toLowerCase().replace(/_/g, ' '),
      },
      manager,
    );
  }

  /**
   * Resolves (creating on first use) an owned payable account — a hub
   * operator or a referrer. `externalPayoutAddress` is what makes its
   * balance eligible to leave the platform in a NET_PAYABLE settlement
   * batch; without one the balance simply accumulates in the ledger.
   */
  async getPayableAccount(
    kind: LedgerAccountKind.HUB_OPERATOR | LedgerAccountKind.REFERRAL,
    ownerId: string,
    currency?: string,
    externalPayoutAddress?: string | null,
    manager?: EntityManager,
  ): Promise<LedgerAccount> {
    return this.ledger.getOrCreateAccount(
      {
        kind,
        ownerId,
        currency: currency ?? this.defaultCurrency(),
        externalPayoutAddress: externalPayoutAddress ?? null,
        label: `${kind.toLowerCase().replace(/_/g, ' ')} payable`,
      },
      manager,
    );
  }

  async getBalance(
    userId: string,
    currency?: string,
  ): Promise<CreditBalanceView> {
    const resolvedCurrency = (currency ?? this.defaultCurrency()).toUpperCase();
    const account = await this.ledger.findAccount({
      kind: LedgerAccountKind.USER,
      ownerId: userId,
      currency: resolvedCurrency,
    });

    if (!account) {
      // No account yet simply means no movement yet — a zero balance, not
      // an error. The account is created lazily by the first charge or
      // top-up.
      return {
        accountId: null,
        userId,
        currency: resolvedCurrency,
        balance: 0,
        overdraftLimit: 0,
        spendable: 0,
        frozen: false,
      };
    }

    return {
      accountId: account.id,
      userId,
      currency: account.currency,
      balance: account.balance,
      overdraftLimit: account.overdraftLimit,
      spendable: account.balance + account.overdraftLimit,
      frozen: account.frozen,
    };
  }

  /**
   * Debits a member's credit balance and credits the platform revenue
   * account. Synchronous and cheap by design — no payment rail, no
   * on-chain call. Rejected (409) if it would breach the account's
   * overdraft ceiling; idempotent on `reference`.
   */
  async charge(input: ChargeCreditsInput): Promise<ChargeCreditsResult> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new BadRequestException(
        'Charge amount must be a positive integer (minor units)',
      );
    }
    if (!input.reason?.trim()) {
      throw new BadRequestException('A charge reason is required');
    }
    if (!input.reference?.trim()) {
      throw new BadRequestException('A charge reference is required');
    }

    const currency = (input.currency ?? this.defaultCurrency()).toUpperCase();
    const userAccount = await this.getUserAccount(input.userId, currency);
    const revenueAccount = await this.getSystemAccount(
      LedgerAccountKind.REVENUE,
      currency,
    );

    const { transaction, posted } = await this.ledger.post({
      reference: `charge:${input.reference.trim()}`,
      kind: LedgerTransactionKind.CHARGE,
      currency,
      description: input.reason.trim(),
      metadata: input.metadata ?? null,
      actorId: input.actorId ?? null,
      legs: [
        {
          accountId: userAccount.id,
          direction: LedgerEntryDirection.DEBIT,
          amount: input.amount,
        },
        {
          accountId: revenueAccount.id,
          direction: LedgerEntryDirection.CREDIT,
          amount: input.amount,
        },
      ],
    });

    const after = await this.ledger.getAccount(userAccount.id);
    return { transaction, posted, balanceAfter: after.balance, currency };
  }

  /**
   * Credits a member's balance from money that already arrived over a
   * payment rail — the top-up path. TREASURY is debited as the
   * counterparty because the value crossed the platform boundary: one
   * fiat or on-chain payment funds many future micro-charges.
   *
   * Kept idempotent on the payment id rather than on a caller-supplied
   * key, so a sweep that re-examines the same CONFIRMED payment (or two
   * sweeps racing) can only ever credit it once.
   */
  async topUpFromPayment(input: {
    paymentId: string;
    userId: string;
    amount: number;
    currency: string;
    manager?: EntityManager;
  }): Promise<{ transaction: LedgerTransaction; posted: boolean }> {
    const currency = input.currency.toUpperCase();
    const userAccount = await this.getUserAccount(
      input.userId,
      currency,
      input.manager,
    );
    const treasury = await this.getSystemAccount(
      LedgerAccountKind.TREASURY,
      currency,
      input.manager,
    );

    return this.ledger.post(
      {
        reference: `top-up:payment:${input.paymentId}`,
        kind: LedgerTransactionKind.TOP_UP,
        currency,
        description: `Credit top-up funded by payment ${input.paymentId}`,
        metadata: { paymentId: input.paymentId },
        legs: [
          {
            accountId: treasury.id,
            direction: LedgerEntryDirection.DEBIT,
            amount: input.amount,
          },
          {
            accountId: userAccount.id,
            direction: LedgerEntryDirection.CREDIT,
            amount: input.amount,
          },
        ],
      },
      input.manager,
    );
  }

  /**
   * Admin correction. Always a fresh ADJUSTMENT transaction against
   * TREASURY rather than an edit of anything already posted — the entries
   * are append-only, so the audit trail keeps both the original and the
   * correction.
   */
  async adjust(input: {
    userId: string;
    /** Positive credits the member, negative debits them. */
    delta: number;
    currency?: string;
    reference: string;
    reason: string;
    actorId: string;
  }): Promise<{ transaction: LedgerTransaction; posted: boolean }> {
    if (!Number.isInteger(input.delta) || input.delta === 0) {
      throw new BadRequestException(
        'Adjustment delta must be a non-zero integer (minor units)',
      );
    }
    if (!input.reason?.trim()) {
      throw new BadRequestException('An adjustment reason is required');
    }

    const currency = (input.currency ?? this.defaultCurrency()).toUpperCase();
    const userAccount = await this.getUserAccount(input.userId, currency);
    const treasury = await this.getSystemAccount(
      LedgerAccountKind.TREASURY,
      currency,
    );
    const amount = Math.abs(input.delta);
    const creditsUser = input.delta > 0;

    return this.ledger.post({
      reference: `adjustment:${input.reference.trim()}`,
      kind: LedgerTransactionKind.ADJUSTMENT,
      currency,
      description: input.reason.trim(),
      actorId: input.actorId,
      legs: [
        {
          accountId: creditsUser ? treasury.id : userAccount.id,
          direction: LedgerEntryDirection.DEBIT,
          amount,
        },
        {
          accountId: creditsUser ? userAccount.id : treasury.id,
          direction: LedgerEntryDirection.CREDIT,
          amount,
        },
      ],
    });
  }
}
