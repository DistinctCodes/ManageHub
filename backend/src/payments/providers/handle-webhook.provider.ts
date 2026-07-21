import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus, EscrowStatus } from '../entities/payment.entity';
import { SorobanEscrowProvider } from './soroban-escrow.provider';
import * as StellarSdk from '@stellar/stellar-sdk';

@Injectable()
export class HandleWebhookProvider {
  private readonly logger = new Logger(HandleWebhookProvider.name);
  private custodianKeypair: StellarSdk.Keypair | null = null;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly sorobanEscrow: SorobanEscrowProvider,
  ) {
    const secret = process.env.SOROBAN_CUSTODIAN_SECRET_KEY;
    if (secret) {
      this.custodianKeypair = StellarSdk.Keypair.fromSecret(secret);
    }
  }

  async handlePaymentSuccess(payment: Payment): Promise<void> {
    if (!this.custodianKeypair) {
      this.logger.warn('No custodian keypair configured, skipping escrow creation');
      return;
    }

    if (payment.escrowStatus !== EscrowStatus.NOT_CREATED) {
      this.logger.log(`Escrow already exists for payment ${payment.reference}`);
      return;
    }

    try {
      const escrowId = this.generateEscrowId(payment.reference);

      await this.sorobanEscrow.createEscrow({
        id: escrowId,
        payerKeypair: this.custodianKeypair,
        custodianAddress: this.custodianKeypair.publicKey(),
        payeeAddress: payment.metadata?.payeeAddress as string || this.custodianKeypair.publicKey(),
        amount: payment.amount,
        tokenAddress: process.env.SOROBAN_USDC_CONTRACT_ID || '',
        bookingId: payment.bookingId || payment.reference,
      });

      payment.sorobanEscrowId = escrowId;
      payment.escrowStatus = EscrowStatus.FUNDED;
      await this.paymentRepository.save(payment);

      this.logger.log(`Escrow ${escrowId} created for payment ${payment.reference}`);
    } catch (error) {
      this.logger.error(`Failed to create escrow for payment ${payment.reference}: ${error.message}`);
    }
  }

  async handleBookingCompleted(bookingId: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { bookingId },
    });

    if (!payment || !payment.sorobanEscrowId || !this.custodianKeypair) {
      return;
    }

    if (payment.escrowStatus !== EscrowStatus.FUNDED) {
      this.logger.warn(`Escrow not in funded state for booking ${bookingId}`);
      return;
    }

    try {
      await this.sorobanEscrow.releaseEscrow(
        this.custodianKeypair,
        payment.sorobanEscrowId,
      );

      payment.escrowStatus = EscrowStatus.RELEASED;
      await this.paymentRepository.save(payment);

      this.logger.log(`Escrow released for booking ${bookingId}`);
    } catch (error) {
      this.logger.error(`Failed to release escrow for booking ${bookingId}: ${error.message}`);
    }
  }

  async handleBookingCancelled(bookingId: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { bookingId },
    });

    if (!payment || !payment.sorobanEscrowId || !this.custodianKeypair) {
      return;
    }

    if (payment.escrowStatus !== EscrowStatus.FUNDED) {
      this.logger.warn(`Escrow not in funded state for booking ${bookingId}`);
      return;
    }

    try {
      await this.sorobanEscrow.refundEscrow(
        this.custodianKeypair,
        payment.sorobanEscrowId,
      );

      payment.escrowStatus = EscrowStatus.REFUNDED;
      await this.paymentRepository.save(payment);

      this.logger.log(`Escrow refunded for booking ${bookingId}`);
    } catch (error) {
      this.logger.error(`Failed to refund escrow for booking ${bookingId}: ${error.message}`);
    }
  }

  private generateEscrowId(reference: string): string {
    const hash = StellarSdk.hash(Buffer.from(reference));
    return hash.toString('hex').substring(0, 64);
  }
}
