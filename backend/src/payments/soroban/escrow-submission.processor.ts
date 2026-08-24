import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { Keypair } from '@stellar/stellar-sdk';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentFailureReason } from '../enums/payment-failure-reason.enum';
import { ConfirmationSource } from '../enums/confirmation-source.enum';
import { PaymentConfirmationService } from '../payment-confirmation.service';
import { WalletsService } from '../../wallets/wallets.service';
import {
  attachSignature,
  EscrowContractClient,
} from './escrow-contract.client';
import { EscrowStatus } from './escrow-status.enum';
import { deriveEscrowId } from './escrow-id';
import { mapSorobanError } from './soroban-error-mapping';
import { SorobanConfig } from './soroban-config';
import {
  ESCROW_CONTRACT_CLIENT,
  SOROBAN_CONFIG,
  SOROBAN_ESCROW_QUEUE,
} from './soroban.tokens';

type SubmitJobData =
  | { kind: 'create'; paymentId: string }
  | { kind: 'release'; escrowIdHex: string; paymentId: string }
  | { kind: 'refund'; escrowIdHex: string }
  // Treasury -> recipient transfer for a settlement batch's off-platform
  // leg (issue #1575). Reuses this rail rather than adding a second one:
  // an escrow created and released to the beneficiary in one job is a
  // transfer, and it inherits the failure/retry semantics above for free.
  | {
      kind: 'payout';
      escrowIdHex: string;
      beneficiaryAddress: string;
      amount: number;
    };

/**
 * Runs the actual on-chain submission pipeline off the request thread
 * (issue #1574): build -> simulate -> sign -> submit -> bounded poll.
 *
 * `concurrency: 1` on the one `@Process()` handler below is deliberate:
 * every submission this rail makes — payer-signed creates, treasury-signed
 * releases/refunds — is strictly serialized, regardless of which account
 * signs it. That's a stronger guarantee than "per signing account" (what
 * the issue asks for); the cost is throughput, not correctness, and
 * throughput isn't the bottleneck for an escrow rail. A real Bull+Redis
 * integration test is the natural follow-up to verify this at the queue
 * level — this module's own tests verify the logic each handler runs, not
 * Bull's own scheduling.
 */
@Processor(SOROBAN_ESCROW_QUEUE)
export class EscrowSubmissionProcessor {
  private readonly logger = new Logger(EscrowSubmissionProcessor.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @Inject(ESCROW_CONTRACT_CLIENT)
    private readonly contractClient: EscrowContractClient,
    @Inject(SOROBAN_CONFIG) private readonly sorobanConfig: SorobanConfig,
    private readonly walletsService: WalletsService,
    private readonly confirmationService: PaymentConfirmationService,
    private readonly config: ConfigService,
  ) {}

  @Process({ name: 'submit', concurrency: 1 })
  async handleSubmit(job: Job<SubmitJobData>): Promise<void> {
    switch (job.data.kind) {
      case 'create':
        return this.handleCreate(job.data.paymentId);
      case 'release':
        return this.handleRelease(job.data.escrowIdHex);
      case 'refund':
        return this.handleRefund(job.data.escrowIdHex);
      case 'payout':
        return this.handlePayout(job.data);
    }
  }

  private async handleCreate(paymentId: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      this.logger.warn(`submit(create) job for unknown payment ${paymentId}`);
      return;
    }
    if (payment.status !== PaymentStatus.AWAITING_CONFIRMATION) {
      // Already resolved by a previous attempt or by reconciliation —
      // replay-safe no-op, never a duplicate submission.
      return;
    }

    const escrowId = deriveEscrowId(payment.id);
    const walletStatus = await this.walletsService.getWalletStatus(
      payment.userId,
    );
    if (!walletStatus.account) {
      this.logger.error(
        `Payment ${payment.id}: user ${payment.userId} has no custodial wallet to fund escrow from`,
      );
      return; // leave AWAITING_CONFIRMATION — surfaces via manual-review escalation
    }
    const payerAddress = walletStatus.account.address;

    try {
      const tx = await this.contractClient.buildCreateTx(
        payerAddress,
        escrowId,
        payerAddress,
        this.sorobanConfig.beneficiaryAddress,
        BigInt(payment.amount),
      );
      const signature = await this.walletsService.signPayload(
        payment.userId,
        tx.hash(),
        'soroban-escrow-create',
      );
      attachSignature(tx, payerAddress, signature);

      const { hash } = await this.contractClient.submit(tx);
      const finality = await this.contractClient.pollFinality(
        hash,
        this.pollOptions(),
      );

      if (finality === 'NOT_FOUND') {
        this.logger.warn(
          `Payment ${payment.id}: create tx ${hash} not final within the bounded poll — leaving AWAITING_CONFIRMATION for reconciliation`,
        );
        return;
      }

      await this.resolveFromFreshState(payment, escrowId, hash);
    } catch (error) {
      await this.handleSubmissionError(payment, escrowId, error);
    }
  }

  /**
   * The only path allowed to move a Payment to CONFIRMED (issue #1574's
   * hard rule): a submission's tx-level SUCCESS only proves the call
   * didn't revert, not that the escrow itself is in the state we expect —
   * so this always re-asks the contract directly before applying anything.
   */
  private async resolveFromFreshState(
    payment: Payment,
    escrowId: Buffer,
    hashForLog: string,
  ): Promise<void> {
    const status = await this.contractClient.getEscrowStatus(
      this.sorobanConfig.treasuryPublicKey,
      escrowId,
    );

    if (status === EscrowStatus.LOCKED || status === EscrowStatus.RELEASED) {
      await this.applyOutcome(payment, escrowId, 'confirmed');
      return;
    }
    if (status === EscrowStatus.REFUNDED) {
      await this.applyOutcome(
        payment,
        escrowId,
        'failed',
        PaymentFailureReason.CONTRACT_REVERTED,
      );
      return;
    }

    this.logger.warn(
      `Payment ${payment.id}: tx ${hashForLog} landed but a fresh read shows escrow status ${status} — leaving AWAITING_CONFIRMATION`,
    );
  }

  private async handleSubmissionError(
    payment: Payment,
    escrowId: Buffer,
    error: unknown,
  ): Promise<void> {
    const mapping = mapSorobanError(error);

    if (mapping.alreadySucceeded) {
      // A retried create against the contract's own idempotent guard —
      // resolve from fresh state rather than assuming anything.
      await this.resolveFromFreshState(payment, escrowId, 'retry');
      return;
    }

    if (mapping.reason === null) {
      // Indeterminate (network/timeout/RPC down) — NOT a definite verdict
      // that the transaction didn't land. Never fail the payment and
      // never resubmit here; reconciliation asks the chain directly,
      // independent of this attempt's own bounded poll.
      this.logger.warn(
        `Payment ${payment.id}: create submission indeterminate (` +
          (error instanceof Error ? error.message : String(error)) +
          ') — leaving AWAITING_CONFIRMATION',
      );
      return;
    }

    await this.applyOutcome(payment, escrowId, 'failed', mapping.reason);
  }

  private async applyOutcome(
    payment: Payment,
    escrowId: Buffer,
    outcome: 'confirmed' | 'failed',
    failureReason?: PaymentFailureReason,
  ): Promise<void> {
    const escrowIdHex = escrowId.toString('hex');
    const rawPayloadHash = PaymentConfirmationService.hashPayload(
      Buffer.from(JSON.stringify({ escrowId: escrowIdHex, outcome })),
    );
    const applied = await this.confirmationService.apply(
      escrowIdHex,
      outcome,
      ConfirmationSource.RECONCILIATION,
      rawPayloadHash,
    );
    if (applied?.status === PaymentStatus.FAILED && failureReason) {
      await this.paymentRepository.update(payment.id, { failureReason });
    }
  }

  private async handleRelease(escrowIdHex: string): Promise<void> {
    await this.submitTreasuryAction(escrowIdHex, 'release');
  }

  /**
   * The off-platform leg of a credit-ledger settlement batch (issue
   * #1575): a treasury-funded escrow created for, and immediately
   * released to, the recipient.
   *
   * Every step re-reads contract state first, so the job is idempotent
   * against its own retries and against a duplicate delivery of the same
   * escrow id: an escrow that already exists is not created again, and one
   * already RELEASED is left alone. That, plus the deterministic escrow id
   * the adapter derives from the settlement payout's idempotency key, is
   * what lets settlement re-run a batch without paying anyone twice.
   *
   * This never reports success back to settlement. SettlementService only
   * ever believes a fresh `getEscrowStatus` read (see
   * SorobanPayoutAdapter.getPayoutStatus), so a job that dies here leaves
   * the payout SUBMITTED and the ledger still showing the balance as owed.
   */
  private async handlePayout(data: {
    escrowIdHex: string;
    beneficiaryAddress: string;
    amount: number;
  }): Promise<void> {
    const escrowId = Buffer.from(data.escrowIdHex, 'hex');
    const treasuryKeypair = Keypair.fromSecret(
      this.sorobanConfig.treasurySecretKey,
    );

    try {
      const existing = await this.contractClient.getEscrowStatus(
        this.sorobanConfig.treasuryPublicKey,
        escrowId,
      );

      if (existing === EscrowStatus.RELEASED) {
        this.logger.log(
          `Payout escrow ${data.escrowIdHex} is already released — nothing to do`,
        );
        return;
      }

      if (existing === EscrowStatus.NOT_FOUND) {
        const tx = await this.contractClient.buildCreateTx(
          treasuryKeypair.publicKey(),
          escrowId,
          treasuryKeypair.publicKey(),
          data.beneficiaryAddress,
          BigInt(data.amount),
        );
        tx.sign(treasuryKeypair);
        const { hash } = await this.contractClient.submit(tx);
        const finality = await this.contractClient.pollFinality(
          hash,
          this.pollOptions(),
        );
        if (finality !== 'SUCCESS') {
          this.logger.warn(
            `Payout escrow ${data.escrowIdHex}: create tx ${hash} is ` +
              `${finality} within the bounded poll — leaving it for the next ` +
              'settlement pass to re-read',
          );
          return;
        }
      }

      // Fresh read again: the create above only proves the call did not
      // revert, not that the escrow is in the state a release needs.
      const beforeRelease = await this.contractClient.getEscrowStatus(
        this.sorobanConfig.treasuryPublicKey,
        escrowId,
      );
      if (beforeRelease !== EscrowStatus.LOCKED) {
        this.logger.warn(
          `Payout escrow ${data.escrowIdHex} is ${beforeRelease} after ` +
            'create — not releasing',
        );
        return;
      }
      await this.submitTreasuryAction(data.escrowIdHex, 'release');
    } catch (error) {
      const mapping = mapSorobanError(error);
      if (mapping.alreadySucceeded) {
        this.logger.log(
          `Payout escrow ${data.escrowIdHex}: contract reports already done`,
        );
        return;
      }
      this.logger.error(
        `Payout escrow ${data.escrowIdHex} failed: ` +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  private async handleRefund(escrowIdHex: string): Promise<void> {
    await this.submitTreasuryAction(escrowIdHex, 'refund');
  }

  /**
   * Best-effort on-chain execution for release/refund — mirrors
   * RefundsService's existing philosophy (issue #1572): these don't drive
   * Payment#status here (release happens after a Payment is already
   * CONFIRMED; refund's ledger-level truth is committed by RefundsService
   * before this ever runs), so a failure is logged, not retried blindly.
   */
  private async submitTreasuryAction(
    escrowIdHex: string,
    kind: 'release' | 'refund',
  ): Promise<void> {
    const escrowId = Buffer.from(escrowIdHex, 'hex');
    const treasuryKeypair = Keypair.fromSecret(
      this.sorobanConfig.treasurySecretKey,
    );

    try {
      const tx =
        kind === 'release'
          ? await this.contractClient.buildReleaseTx(
              treasuryKeypair.publicKey(),
              escrowId,
            )
          : await this.contractClient.buildRefundTx(
              treasuryKeypair.publicKey(),
              escrowId,
            );
      tx.sign(treasuryKeypair);

      const { hash } = await this.contractClient.submit(tx);
      const finality = await this.contractClient.pollFinality(
        hash,
        this.pollOptions(),
      );
      this.logger.log(`Escrow ${escrowIdHex} ${kind} tx ${hash}: ${finality}`);
    } catch (error) {
      const mapping = mapSorobanError(error);
      if (mapping.alreadySucceeded) {
        this.logger.log(
          `Escrow ${escrowIdHex} ${kind}: contract reports already done — treating as success`,
        );
        return;
      }
      this.logger.error(
        `Escrow ${escrowIdHex} ${kind} failed: ` +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  private pollOptions(): { timeoutMs: number; intervalMs: number } {
    return {
      timeoutMs: this.config.get<number>('SOROBAN_POLL_TIMEOUT_MS', 15000),
      intervalMs: this.config.get<number>('SOROBAN_POLL_INTERVAL_MS', 2000),
    };
  }
}
