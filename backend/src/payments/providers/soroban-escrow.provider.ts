import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SorobanRpc,
  TransactionBuilder,
  Operation,
  Keypair,
  xdr,
} from '@stellar/stellar-sdk';
import {
  mapScValToescrow,
  mapScValToescrowStatus,
} from 'src/utils/soroban-types';

const TTL = 10 * 60; // 10 minutes

@Injectable()
export class SorobanEscrowProvider {
  private readonly logger = new Logger(SorobanEscrowProvider.name);
  private readonly contractId: string;
  private readonly server: SorobanRpc.Server;
  private readonly source: Keypair | null;
  private readonly networkPassphrase: string;

  constructor(private readonly configService: ConfigService) {
    this.contractId = this.configService.get<string>(
      'STELLAR_ESCROW_CONTRACT_ID',
      '',
    );
    this.networkPassphrase = this.configService.get<string>(
      'STELLAR_NETWORK',
      '',
    );

    const secretKey = this.configService.get<string>('STELLAR_SECRET_KEY');
    this.source = secretKey ? Keypair.fromSecret(secretKey) : null;

    this.server = new SorobanRpc.Server(
      this.configService.get<string>(
        'STELLAR_HORIZON_URL',
        'https://soroban-testnet.stellar.org',
      ),
      { allowHttp: true },
    );
  }

  async createEscrow(
    bookingId: string,
    depositorAddress: string,
    beneficiary: string,
    amount: number,
    memo: string,
    releaseAfterUnix: number,
  ): Promise<string> {
    this.logger.log(
      `[Soroban] createEscrow: ${bookingId} - ${amount} from ${depositorAddress}`,
    );

    const timebounds = {
      minTime: 0,
      maxTime: Math.floor(Date.now() / 1000) + TTL,
    };

    const tx = new TransactionBuilder(await this.getSourceAccount(), {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
      timebounds,
    })
      .addOperation(
        Operation.invokeHostFunction({
          func: xdr.HostFunction.fromXDR(
            Buffer.from(
              'AAAAAwoAAAAJZHJhd19mcm9tAAAAAAIAAAALZGVwb3NpdG9yAAAADwAAAAdhbW91bnQAAAAACg==',
              'base64',
            ),
          ),
          auth: [
            new xdr.SorobanAuthorizationEntry({
              credentials:
                xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
              rootInvocation: new xdr.SorobanAuthorizedInvocation({
                function:
                  xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
                    new xdr.InvokeContractArgs({
                      contractAddress: xdr.ScAddress.scAddressTypeContract(
                        Buffer.from(this.contractId, 'hex'),
                      ),
                      functionName: 'draw_from',
                      args: [
                        xdr.ScVal.scvAddress(
                          xdr.ScAddress.scAddressTypeAccount(
                            xdr.PublicKey.publicKeyTypeEd25519(
                              Keypair.fromPublicKey(
                                depositorAddress,
                              ).rawPublicKey(),
                            ),
                          ),
                        ),
                        xdr.ScVal.scvU128(
                          new xdr.UInt128Parts({
                            hi: xdr.Uint64.fromString('0'),
                            lo: xdr.Uint64.fromString(amount.toString()),
                          }),
                        ),
                      ],
                    }),
                  ),
                subInvocations: [],
              }),
            }),
          ],
        }),
      )
      .build();

    try {
      const preparedTransaction = await this.server.prepareTransaction(tx);
      preparedTransaction.sign(this.getSigningKeypair());

      const sentTransaction =
        await this.server.sendTransaction(preparedTransaction);

      let getTransactionResponse =
        await this.server.getTransaction(sentTransaction.hash);

      const thirtySeconds = 30 * 1000;
      const startTime = Date.now();
      while (
        getTransactionResponse.status !==
          SorobanRpc.Api.GetTransactionStatus.SUCCESS &&
        Date.now() - startTime < thirtySeconds
      ) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // eslint-disable-next-line no-await-in-loop
        getTransactionResponse =
          // eslint-disable-next-line no-await-in-loop
          await this.server.getTransaction(sentTransaction.hash);
      }

      if (
        getTransactionResponse.status !==
        SorobanRpc.Api.GetTransactionStatus.SUCCESS
      ) {
        this.logger.error(
          `[Soroban] createEscrow failed for booking ${bookingId}: Transaction execution failed`,
        );
        throw new BadGatewayException(
          'Failed to execute Soroban transaction.',
        );
      }

      return sentTransaction.hash;
    } catch (error) {
      this.logger.error(
        `[Soroban] createEscrow failed for booking ${bookingId}: ${error.message}`,
      );
      throw new BadGatewayException(
        'Failed to create escrow on Soroban network.',
      );
    }
  }

  async releaseEscrow(escrowId: string): Promise<string> {
    this.logger.log(`[Soroban] releaseEscrow: ${escrowId}`);

    const timebounds = {
      minTime: 0,
      maxTime: Math.floor(Date.now() / 1000) + TTL,
    };

    const tx = new TransactionBuilder(await this.getSourceAccount(), {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
      timebounds,
    })
      .addOperation(
        Operation.invokeHostFunction({
          func: xdr.HostFunction.fromXDR(
            Buffer.from(
              'AAAAAQAAAAdyZWxlYXNlAAAAAAEAAAAMZXNjcm93X2lkAAAAAAAS',
              'base64',
            ),
          ),
          auth: [],
        }),
      )
      .build();

    try {
      const preparedTransaction = await this.server.prepareTransaction(tx);
      preparedTransaction.sign(this.getSigningKeypair());

      const sentTransaction =
        await this.server.sendTransaction(preparedTransaction);

      let getTransactionResponse =
        await this.server.getTransaction(sentTransaction.hash);

      const thirtySeconds = 30 * 1000;
      const startTime = Date.now();
      while (
        getTransactionResponse.status !==
          SorobanRpc.Api.GetTransactionStatus.SUCCESS &&
        Date.now() - startTime < thirtySeconds
      ) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // eslint-disable-next-line no-await-in-loop
        getTransactionResponse =
          // eslint-disable-next-line no-await-in-loop
          await this.server.getTransaction(sentTransaction.hash);
      }

      if (
        getTransactionResponse.status !==
        SorobanRpc.Api.GetTransactionStatus.SUCCESS
      ) {
        this.logger.error(
          `[Soroban] releaseEscrow failed for escrow ${escrowId}: Transaction execution failed`,
        );
        throw new BadGatewayException(
          'Failed to execute Soroban transaction.',
        );
      }

      return sentTransaction.hash;
    } catch (error) {
      this.logger.error(
        `[Soroban] releaseEscrow failed for escrow ${escrowId}: ${error.message}`,
      );
      throw new BadGatewayException(
        'Failed to release escrow on Soroban network.',
      );
    }
  }

  async refundEscrow(escrowId: string): Promise<string> {
    this.logger.log(`[Soroban] refundEscrow: ${escrowId}`);

    const timebounds = {
      minTime: 0,
      maxTime: Math.floor(Date.now() / 1000) + TTL,
    };

    const tx = new TransactionBuilder(await this.getSourceAccount(), {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
      timebounds,
    })
      .addOperation(
        Operation.invokeHostFunction({
          func: xdr.HostFunction.fromXDR(
            Buffer.from(
              'AAAAAQAAAAdyZWZ1bmQAAAAAAAEAAAAMZXNjcm93X2lkAAAAAAAS',
              'base64',
            ),
          ),
          auth: [],
        }),
      )
      .build();

    try {
      const preparedTransaction = await this.server.prepareTransaction(tx);
      preparedTransaction.sign(this.getSigningKeypair());

      const sentTransaction =
        await this.server.sendTransaction(preparedTransaction);

      let getTransactionResponse =
        await this.server.getTransaction(sentTransaction.hash);

      const thirtySeconds = 30 * 1000;
      const startTime = Date.now();
      while (
        getTransactionResponse.status !==
          SorobanRpc.Api.GetTransactionStatus.SUCCESS &&
        Date.now() - startTime < thirtySeconds
      ) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // eslint-disable-next-line no-await-in-loop
        getTransactionResponse =
          // eslint-disable-next-line no-await-in-loop
          await this.server.getTransaction(sentTransaction.hash);
      }

      if (
        getTransactionResponse.status !==
        SorobanRpc.Api.GetTransactionStatus.SUCCESS
      ) {
        this.logger.error(
          `[Soroban] refundEscrow failed for escrow ${escrowId}: Transaction execution failed`,
        );
        throw new BadGatewayException(
          'Failed to execute Soroban transaction.',
        );
      }

      return sentTransaction.hash;
    } catch (error) {
      this.logger.error(
        `[Soroban] refundEscrow failed for escrow ${escrowId}: ${error.message}`,
      );
      throw new BadGatewayException(
        'Failed to refund escrow on Soroban network.',
      );
    }
  }

  async getEscrowStatus(escrowId: string): Promise<any> {
    this.logger.log(`[Soroban] getEscrowStatus: ${escrowId}`);

    const timebounds = {
      minTime: 0,
      maxTime: Math.floor(Date.now() / 1000) + TTL,
    };

    const tx = new TransactionBuilder(await this.getSourceAccount(), {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
      timebounds,
    })
      .addOperation(
        Operation.invokeHostFunction({
          func: xdr.HostFunction.fromXDR(
            Buffer.from(
              'AAAAAQAAAApnZXRfZXNjcm93AAAAAAEAAAAMZXNjcm93X2lkAAAAAAAS',
              'base64',
            ),
          ),
          auth: [],
        }),
      )
      .build();

    try {
      const preparedTransaction = await this.server.prepareTransaction(tx);
      const simulatedTransaction =
        await this.server.simulateTransaction(preparedTransaction);

      if (
        !SorobanRpc.Api.isSimulationSuccess(simulatedTransaction) ||
        !simulatedTransaction.result?.retval
      ) {
        this.logger.error(
          `[Soroban] getEscrowStatus failed for escrow ${escrowId}: Invalid simulation response`,
        );
        throw new NotFoundException('Escrow not found.');
      }

      const escrow = mapScValToescrow(simulatedTransaction.result.retval);
      return {
        ...escrow,
        status: mapScValToescrowStatus(escrow.status),
      };
    } catch (error) {
      this.logger.error(
        `[Soroban] getEscrowStatus failed for escrow ${escrowId}: ${error.message}`,
      );
      throw new BadGatewayException(
        'Failed to get escrow status from Soroban network.',
      );
    }
  }

  private getSigningKeypair(): Keypair {
    if (!this.source) {
      throw new BadGatewayException(
        'Soroban signing key is not configured (STELLAR_SECRET_KEY missing).',
      );
    }
    return this.source;
  }

  private async getSourceAccount() {
    return await this.server.getAccount(this.getSigningKeypair().publicKey());
  }
}
