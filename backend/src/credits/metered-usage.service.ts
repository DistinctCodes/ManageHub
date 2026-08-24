import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeteredUsageEvent } from './entities/metered-usage-event.entity';
import { MeteredResource } from './enums/metered-resource.enum';
import { CreditsService } from './credits.service';

const POSTGRES_UNIQUE_VIOLATION = '23505';

export interface RecordUsageInput {
  userId: string;
  resource: MeteredResource;
  /** Minutes, pages, ... — whatever this resource meters. */
  units: number;
  /** Minor units per unit. */
  unitPrice: number;
  currency?: string;
  /** The caller's natural key for this usage event — the dedupe key. */
  usageReference: string;
  actorId?: string | null;
}

export interface RecordUsageResult {
  event: MeteredUsageEvent;
  /** False when this usage event had already been recorded and charged. */
  charged: boolean;
}

/**
 * The metered call site for the credit ledger's spend path (issue #1575):
 * per-minute resource usage, printing and meeting-room overage priced in
 * minor units and charged straight against a member's credit balance.
 *
 * This is the shape a resource-usage feature is expected to have — it owns
 * the pricing and the usage audit record, and it hands the ledger nothing
 * but an amount and a dedupe key. No payment rail and no chain call is
 * involved: settling a two-cent print job individually would cost more in
 * fees and latency than the job itself, which is the whole reason this
 * module exists.
 *
 * A charge and its usage record are made idempotent by two independent
 * unique keys pointing at the same natural reference — the ledger
 * transaction's `charge:usage:<ref>` and this table's `usageReference` —
 * so a retried delivery of the same meter reading charges exactly once
 * even if it fails between the two writes.
 */
@Injectable()
export class MeteredUsageService {
  constructor(
    @InjectRepository(MeteredUsageEvent)
    private readonly usageRepository: Repository<MeteredUsageEvent>,
    private readonly credits: CreditsService,
  ) {}

  async recordUsage(input: RecordUsageInput): Promise<RecordUsageResult> {
    if (!Number.isInteger(input.units) || input.units <= 0) {
      throw new BadRequestException('Usage units must be a positive integer');
    }
    if (!Number.isInteger(input.unitPrice) || input.unitPrice <= 0) {
      throw new BadRequestException(
        'Unit price must be a positive integer (minor units)',
      );
    }
    if (!input.usageReference?.trim()) {
      throw new BadRequestException('A usage reference is required');
    }

    const usageReference = input.usageReference.trim();
    const existing = await this.usageRepository.findOne({
      where: { usageReference },
    });
    if (existing) {
      return { event: existing, charged: false };
    }

    const amount = input.units * input.unitPrice;
    const currency = input.currency ?? this.credits.defaultCurrency();

    // Charge first: the ledger is the thing that must not be wrong. If
    // recording the event below fails, a retry re-charges against the same
    // reference and the ledger returns the original transaction instead of
    // posting a second one.
    const charge = await this.credits.charge({
      userId: input.userId,
      amount,
      currency,
      reference: `usage:${usageReference}`,
      reason: `${input.resource} x${input.units} @ ${input.unitPrice}`,
      metadata: {
        resource: input.resource,
        units: input.units,
        unitPrice: input.unitPrice,
        usageReference,
      },
      actorId: input.actorId ?? null,
    });

    try {
      const event = await this.usageRepository.save(
        this.usageRepository.create({
          userId: input.userId,
          resource: input.resource,
          units: input.units,
          unitPrice: input.unitPrice,
          amount,
          currency: charge.currency,
          usageReference,
          ledgerTransactionId: charge.transaction.id,
        }),
      );
      return { event, charged: charge.posted };
    } catch (error) {
      // Two deliveries of the same meter reading raced. The ledger already
      // deduped the charge, so the loser just reports the winner's event.
      if (this.isUniqueViolation(error)) {
        const winner = await this.usageRepository.findOne({
          where: { usageReference },
        });
        if (winner) {
          return { event: winner, charged: false };
        }
      }
      throw error;
    }
  }

  async listForUser(userId: string, limit = 100): Promise<MeteredUsageEvent[]> {
    return this.usageRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    const code = (error as any)?.code ?? (error as any)?.driverError?.code;
    return code === POSTGRES_UNIQUE_VIOLATION;
  }
}
