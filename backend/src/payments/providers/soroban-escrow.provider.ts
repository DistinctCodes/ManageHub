import { Injectable, Logger } from '@nestjs/common';
import * as StellarSdk from '@stellar/stellar-sdk';

@Injectable()
export class SorobanEscrowProvider {
  private readonly logger = new Logger(SorobanEscrowProvider.name);
  private server: StellarSdk.rpc.Server;
  private contractId: string;
  private networkPassphrase: string;

  constructor() {
    const rpcUrl = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
    this.server = new StellarSdk.rpc.Server(rpcUrl);
    this.contractId = process.env.SOROBAN_ESCROW_CONTRACT_ID || '';
    this.networkPassphrase =
      process.env.SOROBAN_NETWORK_PASSPHRASE || StellarSdk.Networks.TESTNET;
  }

  async createEscrow(params: {
    id: string;
    payerKeypair: StellarSdk.Keypair;
    custodianAddress: string;
    payeeAddress: string;
    amount: number;
    tokenAddress: string;
    bookingId: string;
  }): Promise<string> {
    try {
      const contract = new StellarSdk.Contract(this.contractId);
      const sourceAccount = await this.server.getAccount(
        params.payerKeypair.publicKey(),
      );

      const escrowIdBytes = StellarSdk.nativeToScVal(params.id, {
        type: 'bytes',
      });

      const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          contract.call(
            'create_escrow',
            escrowIdBytes,
            StellarSdk.Address.fromString(params.custodianAddress).toScVal(),
            StellarSdk.Address.fromString(params.payerKeypair.publicKey()).toScVal(),
            StellarSdk.Address.fromString(params.payeeAddress).toScVal(),
            StellarSdk.nativeToScVal(params.amount * 100, { type: 'i128' }),
            StellarSdk.Address.fromString(params.tokenAddress).toScVal(),
            StellarSdk.nativeToScVal(params.bookingId, { type: 'string' }),
          ),
        )
        .setTimeout(StellarSdk.TimeoutInfinite)
        .build();

      txBuilder.sign(params.payerKeypair);

      const result = await this.server.sendTransaction(txBuilder);

      if (result.status === 'ERROR') {
        throw new Error(
          `Transaction failed: ${JSON.stringify(result.errorResult)}`,
        );
      }

      return result.hash;
    } catch (error) {
      this.logger.error(`Failed to create escrow: ${error.message}`);
      throw error;
    }
  }

  async releaseEscrow(custodianKeypair: StellarSdk.Keypair, escrowId: string): Promise<string> {
    try {
      const contract = new StellarSdk.Contract(this.contractId);
      const sourceAccount = await this.server.getAccount(
        custodianKeypair.publicKey(),
      );

      const escrowIdBytes = StellarSdk.nativeToScVal(escrowId, {
        type: 'bytes',
      });

      const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          contract.call(
            'release_escrow',
            StellarSdk.Address.fromString(custodianKeypair.publicKey()).toScVal(),
            escrowIdBytes,
          ),
        )
        .setTimeout(StellarSdk.TimeoutInfinite)
        .build();

      txBuilder.sign(custodianKeypair);

      const result = await this.server.sendTransaction(txBuilder);

      if (result.status === 'ERROR') {
        throw new Error(
          `Transaction failed: ${JSON.stringify(result.errorResult)}`,
        );
      }

      return result.hash;
    } catch (error) {
      this.logger.error(`Failed to release escrow: ${error.message}`);
      throw error;
    }
  }

  async refundEscrow(custodianKeypair: StellarSdk.Keypair, escrowId: string): Promise<string> {
    try {
      const contract = new StellarSdk.Contract(this.contractId);
      const sourceAccount = await this.server.getAccount(
        custodianKeypair.publicKey(),
      );

      const escrowIdBytes = StellarSdk.nativeToScVal(escrowId, {
        type: 'bytes',
      });

      const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          contract.call(
            'refund_escrow',
            StellarSdk.Address.fromString(custodianKeypair.publicKey()).toScVal(),
            escrowIdBytes,
          ),
        )
        .setTimeout(StellarSdk.TimeoutInfinite)
        .build();

      txBuilder.sign(custodianKeypair);

      const result = await this.server.sendTransaction(txBuilder);

      if (result.status === 'ERROR') {
        throw new Error(
          `Transaction failed: ${JSON.stringify(result.errorResult)}`,
        );
      }

      return result.hash;
    } catch (error) {
      this.logger.error(`Failed to refund escrow: ${error.message}`);
      throw error;
    }
  }

  async getEscrowStatus(escrowId: string): Promise<string> {
    try {
      const contract = new StellarSdk.Contract(this.contractId);
      const sourceAccount = await this.server.getHealth();

      const escrowIdBytes = StellarSdk.nativeToScVal(escrowId, {
        type: 'bytes',
      });

      const result = await this.server.simulateTransaction(
        new StellarSdk.TransactionBuilder(
          await this.server.getAccount(this.contractId),
          {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: this.networkPassphrase,
          },
        )
          .addOperation(contract.call('get_escrow', escrowIdBytes))
          .setTimeout(StellarSdk.TimeoutInfinite)
          .build(),
      );

      return JSON.stringify(result);
    } catch (error) {
      this.logger.error(`Failed to get escrow status: ${error.message}`);
      throw error;
    }
  }
}
