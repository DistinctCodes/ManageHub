import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerTransaction } from './entities/ledger-transaction.entity';
import { RevenueSplitConfig } from './entities/revenue-split-config.entity';
import { RevenueSplitRecipient } from './entities/revenue-split-recipient.entity';
import { LedgerEntryDirection } from './enums/ledger-entry-direction.enum';
import { LedgerTransactionKind } from './enums/ledger-transaction-kind.enum';
import { LedgerAccountKind } from './enums/ledger-account-kind.enum';
import { LedgerService } from './ledger.service';
import {
  allocateByBasisPoints,
  assertBasisPointsSumToTotal,
  SplitAllocationError,
} from './split-allocation';

const POSTGRES_UNIQUE_VIOLATION = '23505';

export interface RevenueSplitRecipientInput {
  label: string;
  basisPoints: number;
  /** Internal recipient — a ledger account credited with this share. */
  accountId?: string | null;
  /** External recipient — an address a settlement batch pays on-chain. */
  externalAddress?: string | null;
  sortOrder?: number;
}

export interface ComputedSplitShare {
  recipient: RevenueSplitRecipient;
  amount: number;
  remainderUnits: number;
}

/**
 * Configuration and computation of multi-party revenue distribution
 * (issue #1575).
 *
 * Two hard rules, both enforced here rather than discovered later:
 *
 *  1. **Basis points must sum to exactly 10000 at configuration time.** A
 *     config that could not distribute 100% of an amount is rejected when
 *     it is created or edited, so a settlement run never has to decide
 *     what to do with a 97%-complete split.
 *  2. **Rounding never loses or duplicates value.** Allocation goes
 *     through the largest-remainder method in `split-allocation.ts`, whose
 *     output is guaranteed to sum to exactly the input amount — which is
 *     also precisely what lets a split be posted as balanced double-entry
 *     legs, since an unbalanced set of legs is refused by LedgerService.
 */
@Injectable()
export class RevenueSplitService {
  constructor(
    @InjectRepository(RevenueSplitConfig)
    private readonly configRepository: Repository<RevenueSplitConfig>,
    @InjectRepository(RevenueSplitRecipient)
    private readonly recipientRepository: Repository<RevenueSplitRecipient>,
    private readonly ledger: LedgerService,
  ) {}

  async createConfig(input: {
    name: string;
    description?: string | null;
    recipients: RevenueSplitRecipientInput[];
  }): Promise<RevenueSplitConfig> {
    if (!input.name?.trim()) {
      throw new BadRequestException('A revenue split config needs a name');
    }
    await this.assertRecipientsValid(input.recipients);

    try {
      return await this.configRepository.manager.transaction(
        async (manager) => {
          const config = await manager.getRepository(RevenueSplitConfig).save(
            manager.getRepository(RevenueSplitConfig).create({
              name: input.name.trim(),
              description: input.description ?? null,
              active: true,
            }),
          );
          await this.insertRecipients(manager, config.id, input.recipients);
          return this.getConfig(config.id);
        },
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          `A revenue split config named "${input.name.trim()}" already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Replaces a config's recipients wholesale. Validated as a set, because
   * "sums to 10000" is a property of the set — there is no valid way to
   * edit one recipient's share in isolation.
   */
  async replaceRecipients(
    configId: string,
    recipients: RevenueSplitRecipientInput[],
  ): Promise<RevenueSplitConfig> {
    await this.getConfig(configId);
    await this.assertRecipientsValid(recipients);

    return this.configRepository.manager.transaction(async (manager) => {
      await manager.getRepository(RevenueSplitRecipient).delete({ configId });
      await this.insertRecipients(manager, configId, recipients);
      return this.getConfig(configId);
    });
  }

  async setActive(
    configId: string,
    active: boolean,
  ): Promise<RevenueSplitConfig> {
    const config = await this.getConfig(configId);
    config.active = active;
    await this.configRepository.save(config);
    return this.getConfig(configId);
  }

  async listConfigs(): Promise<RevenueSplitConfig[]> {
    return this.configRepository.find({
      relations: { recipients: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getConfig(configId: string): Promise<RevenueSplitConfig> {
    const config = await this.configRepository.findOne({
      where: { id: configId },
      relations: { recipients: true },
    });
    if (!config) {
      throw new NotFoundException(`Revenue split config ${configId} not found`);
    }
    config.recipients = this.sortRecipients(config.recipients ?? []);
    return config;
  }

  async findConfigByName(name: string): Promise<RevenueSplitConfig | null> {
    const config = await this.configRepository.findOne({
      where: { name },
      relations: { recipients: true },
    });
    if (config) {
      config.recipients = this.sortRecipients(config.recipients ?? []);
    }
    return config;
  }

  /**
   * Applies a config to an amount. Re-validates the basis points even
   * though creation already did — cheap, and it means a config mutated by
   * anything that bypassed this service fails loudly here instead of
   * quietly distributing the wrong total.
   */
  async computeForAmount(
    configId: string,
    amount: number,
  ): Promise<ComputedSplitShare[]> {
    const config = await this.getConfig(configId);
    if (!config.active) {
      throw new UnprocessableEntityException(
        `Revenue split config "${config.name}" is inactive`,
      );
    }
    return this.compute(config, amount);
  }

  /** Same as computeForAmount, for an already-loaded config. */
  compute(config: RevenueSplitConfig, amount: number): ComputedSplitShare[] {
    const recipients = this.sortRecipients(config.recipients ?? []);
    try {
      const allocations = allocateByBasisPoints(
        amount,
        recipients.map((recipient) => ({
          key: recipient.id,
          basisPoints: recipient.basisPoints,
          sortOrder: recipient.sortOrder,
        })),
      );
      return allocations.map((allocation, index) => ({
        recipient: recipients[index],
        amount: allocation.amount,
        remainderUnits: allocation.remainderUnits,
      }));
    } catch (error) {
      if (error instanceof SplitAllocationError) {
        throw new UnprocessableEntityException(
          `Revenue split config "${config.name}" cannot distribute ${amount}: ` +
            error.message,
        );
      }
      throw error;
    }
  }

  /**
   * Distributes a confirmed payment's amount across a config as ledger
   * entries (issue #1575's "usable by ordinary #1570 payments" leg).
   * TREASURY is the debited counterparty: the money arrived from outside
   * the platform over a payment rail, and the split decides who inside
   * the platform is now owed it.
   *
   * Deliberately internal-only. A bare external-address recipient is
   * refused for a payment split (see assertUsableForPayment) — moving
   * value off-platform is the settlement batch's job, so an operator's
   * share lands in their payable ledger account and leaves in one netted
   * on-chain transfer instead of one per payment.
   */
  async distributePayment(input: {
    paymentId: string;
    configId: string;
    amount: number;
    currency: string;
    manager?: EntityManager;
  }): Promise<{
    transaction: LedgerTransaction;
    posted: boolean;
    shares: ComputedSplitShare[];
  }> {
    const config = await this.getConfig(input.configId);
    this.assertUsableForPayment(config);
    if (!config.active) {
      throw new UnprocessableEntityException(
        `Revenue split config "${config.name}" is inactive`,
      );
    }

    const shares = this.compute(config, input.amount);
    const currency = input.currency.toUpperCase();
    const treasury = await this.ledger.getOrCreateAccount(
      {
        kind: LedgerAccountKind.TREASURY,
        ownerId: null,
        currency,
        label: 'treasury',
      },
      input.manager,
    );

    const { transaction, posted } = await this.ledger.post(
      {
        reference: `payment-split:${input.paymentId}`,
        kind: LedgerTransactionKind.REVENUE_SPLIT,
        currency,
        description: `Revenue split "${config.name}" over payment ${input.paymentId}`,
        metadata: {
          paymentId: input.paymentId,
          configId: config.id,
          configName: config.name,
        },
        legs: [
          {
            accountId: treasury.id,
            direction: LedgerEntryDirection.DEBIT,
            amount: input.amount,
          },
          // A zero share (a tiny amount over many recipients) posts no
          // leg at all rather than a zero-amount entry; the remaining
          // legs still sum to the full amount, so the transaction
          // balances.
          ...shares
            .filter((share) => share.amount > 0)
            .map((share) => ({
              accountId: share.recipient.accountId!,
              direction: LedgerEntryDirection.CREDIT,
              amount: share.amount,
            })),
        ],
      },
      input.manager,
    );

    return { transaction, posted, shares };
  }

  /**
   * A config attached to a Payment must distribute entirely into ledger
   * accounts. Checked when the config is attached AND again when it is
   * applied, so an operator cannot make a payment silently unsplittable
   * by editing the config in between.
   */
  assertUsableForPayment(config: RevenueSplitConfig): void {
    const external = (config.recipients ?? []).filter(
      (recipient) => !recipient.accountId,
    );
    if (external.length > 0) {
      throw new UnprocessableEntityException(
        `Revenue split config "${config.name}" has external-address ` +
          `recipients (${external.map((r) => r.label).join(', ')}), which a ` +
          'payment split cannot post internally — give those recipients a ' +
          'payable ledger account instead, and let a settlement batch pay ' +
          'them off-platform.',
      );
    }
  }

  // ── internals ──────────────────────────────────────────────────────────

  private async insertRecipients(
    manager: EntityManager,
    configId: string,
    recipients: RevenueSplitRecipientInput[],
  ): Promise<void> {
    const repository = manager.getRepository(RevenueSplitRecipient);
    await repository.save(
      recipients.map((recipient, index) =>
        repository.create({
          configId,
          label: recipient.label.trim(),
          basisPoints: recipient.basisPoints,
          accountId: recipient.accountId ?? null,
          externalAddress: recipient.externalAddress ?? null,
          sortOrder: recipient.sortOrder ?? index,
        }),
      ),
    );
  }

  private async assertRecipientsValid(
    recipients: RevenueSplitRecipientInput[],
  ): Promise<void> {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new BadRequestException(
        'A revenue split config needs at least one recipient',
      );
    }

    for (const recipient of recipients) {
      if (!recipient.label?.trim()) {
        throw new BadRequestException('Every split recipient needs a label');
      }
      const hasAccount = Boolean(recipient.accountId);
      const hasAddress = Boolean(recipient.externalAddress);
      if (hasAccount === hasAddress) {
        throw new BadRequestException(
          `Split recipient "${recipient.label}" must have exactly one of ` +
            'accountId (internal) or externalAddress (on-chain payout)',
        );
      }
    }

    // The whole point of validating here: a config whose shares do not add
    // up to 100% is an operator error, and it becomes a 400 on the request
    // that introduced it rather than a half-distributed settlement run.
    try {
      assertBasisPointsSumToTotal(
        recipients.map((recipient) => ({
          key: recipient.label,
          basisPoints: recipient.basisPoints,
          sortOrder: recipient.sortOrder,
        })),
      );
    } catch (error) {
      if (error instanceof SplitAllocationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    for (const recipient of recipients) {
      if (recipient.accountId) {
        // Fails now, loudly, rather than at settlement time against a
        // ledger account that never existed.
        await this.assertAccountExists(recipient.accountId);
      }
    }
  }

  private async assertAccountExists(accountId: string): Promise<void> {
    const found = await this.recipientRepository.manager
      .getRepository(LedgerAccount)
      .count({ where: { id: accountId } });
    if (found === 0) {
      throw new BadRequestException(`Ledger account ${accountId} not found`);
    }
  }

  private sortRecipients(
    recipients: RevenueSplitRecipient[],
  ): RevenueSplitRecipient[] {
    return [...recipients].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
    );
  }

  private isUniqueViolation(error: unknown): boolean {
    const code = (error as any)?.code ?? (error as any)?.driverError?.code;
    return code === POSTGRES_UNIQUE_VIOLATION;
  }
}
