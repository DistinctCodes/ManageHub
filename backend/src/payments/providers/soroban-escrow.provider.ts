import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Handles on-chain escrow recording for long-term bookings (MONTHLY+).
 *
 * NOTE: Full Stellar SDK integration requires @stellar/stellar-sdk.
 * Run: npm install @stellar/stellar-sdk
 *
 * The methods below are stubs that log intent and return placeholder values
 * until the SDK is installed and the contract IDs are configured.
 */
@Injectable()
export class SorobanEscrowProvider {
  private readonly logger = new Logger(SorobanEscrowProvider.name);
  private readonly contractId: string;
  private readonly network: string;
  private readonly rpcUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.contractId = this.configService.get<string>(
      'PAYMENT_ESCROW_CONTRACT_ID',
      '',
    );
    this.network = this.configService.get<string>('STELLAR_NETWORK', 'testnet');
    this.rpcUrl = this.configService.get<string>(
      'STELLAR_RPC_URL',
      'https://soroban-testnet.stellar.org',
    );
  }

  async createEscrow(
    escrowId: string,
    depositorAddress: string,
    beneficiaryAddress: string,
    amountKobo: number,
    description: string,
    releaseAfterUnix: number,
  ): Promise<string> {
    this.logger.log(
      `[Soroban] createEscrow: ${escrowId} — ${amountKobo} kobo — release after ${releaseAfterUnix}`,
    );
    // TODO: implement with @stellar/stellar-sdk once installed
    // Return a placeholder tx hash for now
    return `soroban_stub_${escrowId}`;
  }

  async releaseEscrow(escrowId: string): Promise<string> {
    this.logger.log(`[Soroban] releaseEscrow: ${escrowId}`);
    return `soroban_release_stub_${escrowId}`;
  }

  async refundEscrow(escrowId: string): Promise<string> {
    this.logger.log(`[Soroban] refundEscrow: ${escrowId}`);
    return `soroban_refund_stub_${escrowId}`;
  }

  async getEscrowStatus(escrowId: string): Promise<Record<string, unknown>> {
    this.logger.log(`[Soroban] getEscrowStatus: ${escrowId}`);
    return { escrowId, status: 'stub' };
  }
}
