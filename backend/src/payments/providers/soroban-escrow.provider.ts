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
  Asset,
  Keypair,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import { randomBytes } from 'crypto';
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
  private readonly source = Keypair.fromSecret(
    this.configService.get<string>('STELLAR_SECRET_KEY'),
  );
  private readonly networkPassphrase =
    this.configService.get<string>('STELLAR_NETWORK');

  constructor(private readonly configService: ConfigService) {
    this.contractId = this.configService.get<string>(
      'STELLAR_ESCROW_CONTRACT_ID',
    );
    this.server = new SorobanRpc.Server(
      this.configService.get<string>('STELLAR_HORIZON_URL'),
      {
        allowHttp: true,
      },
    );
  }

  async createEscrow(
    bookingId: string,
    amount: number,
    depositorAddress: string,
  ): Promise<string> {
    this.logger.log(
      `[Soroban] createEscrow: ${bookingId} - ${amount} from ${depositorAddress}`,
    );

    const tx = new TransactionBuilder(await this.getSourceAccount(), {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
      timebounds: await this.server.getTransactionTimebounds(TTL),
    })
      .addOperation(
        Operation.invokeHostFunction({
          func: xdr.HostFunction.fromXdr(
            Buffer.from(
              'AAAAAwoAAAAJZHJhd19mcm9tAAAAAAIAAAALZGVwb3NpdG9yAAAADwAAAAdhbW91bnQAAAAACg==',
              'base64',
            ),
          ),
          parameters: [
            xdr.ScVal.scvAddress(
              xdr.ScAddress.scAddressTypeAccountId(
                xdr.PublicKey.publicKeyTypeEd25519(
                  Keypair.fromPublicKey(depositorAddress).rawPublicKey(),
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
          auth: [
            new xdr.SorobanAuthorizationEntry({
              credentials: new xdr.SorobanCredentials({
                type: xdr.SorobanCredentialsType.sorobanCredentialsSourceAccount(),
                address: new xdr.SorobanAddress({
                  type: xdr.SorobanAddressType.sorobanAddressTypeAccount(),
                  accountId: Keypair.fromPublicKey(
                    depositorAddress,
                  ).xdrPublicKey(),
                }),
                nonce: xdr.Int64.fromString(
                  (
                    await this.server.getLatestLedger()
                  ).sequence.toString(),
                ),
                signatureExpirationLedger:
                  (await this.server.getLatestLedger()).sequence + TTL,
                signature: randomBytes(64),
              }),
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
                          xdr.ScAddress.scAddressTypeAccountId(
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
      preparedTransaction.sign(this.source);

      const sentTransaction =
        await this.server.sendTransaction(preparedTransaction);

      let getTransactionResponse =
        await this.server.getTransaction(sentTransaction.hash);

      const thirtySeconds = 30 * 1000;
      const startTime = Date.now();
      while (
        getTransactionResponse.status !==
          SorobanRpc.GetTransactionStatus.SUCCESS &&
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
        getTransactionResponse.status !== SorobanRpc.GetTransactionStatus.SUCCESS
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

    const tx = new TransactionBuilder(await this.getSourceAccount(), {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
      timebounds: await this.server.getTransactionTimebounds(TTL),
    })
      .addOperation(
        Operation.invokeHostFunction({
          func: xdr.HostFunction.fromXdr(
            Buffer.from(
              'AAAAAQAAAAdyZWxlYXNlAAAAAAEAAAAMZXNjcm93X2lkAAAAAAAS',
              'base64',
            ),
          ),
          parameters: [xdr.ScVal.scvString(escrowId)],
        }),
      )
      .build();

    try {
      const preparedTransaction = await this.server.prepareTransaction(tx);
      preparedTransaction.sign(this.source);

      const sentTransaction =
        await this.server.sendTransaction(preparedTransaction);

      let getTransactionResponse =
        await this.server.getTransaction(sentTransaction.hash);

      const thirtySeconds = 30 * 1000;
      const startTime = Date.now();
      while (
        getTransactionResponse.status !==
          SorobanRpc.GetTransactionStatus.SUCCESS &&
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
        getTransactionResponse.status !== SorobanRpc.GetTransactionStatus.SUCCESS
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

    const tx = new TransactionBuilder(await this.getSourceAccount(), {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
      timebounds: await this.server.getTransactionTimebounds(TTL),
    })
      .addOperation(
        Operation.invokeHostFunction({
          func: xdr.HostFunction.fromXdr(
            Buffer.from(
              'AAAAAQAAAAdyZWZ1bmQAAAAAAAEAAAAMZXNjcm93X2lkAAAAAAAS',
              'base64',
            ),
          ),
          parameters: [xdr.ScVal.scvString(escrowId)],
        }),
      )
      .build();

    try {
      const preparedTransaction = await this.server.prepareTransaction(tx);
      preparedTransaction.sign(this.source);

      const sentTransaction =
        await this.server.sendTransaction(preparedTransaction);

      let getTransactionResponse =
        await this.server.getTransaction(sentTransaction.hash);

      const thirtySeconds = 30 * 1000;
      const startTime = Date.now();
      while (
        getTransactionResponse.status !==
          SorobanRpc.GetTransactionStatus.SUCCESS &&
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
        getTransactionResponse.status !== SorobanRpc.GetTransactionStatus.SUCCESS
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

    const tx = new TransactionBuilder(await this.getSourceAccount(), {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
      timebounds: await this.server.getTransactionTimebounds(TTL),
    })
      .addOperation(
        Operation.invokeHostFunction({
          func: xdr.HostFunction.fromXdr(
            Buffer.from(
              'AAAAAQAAAApnZXRfZXNjcm93AAAAAAEAAAAMZXNjcm93X2lkAAAAAAAS',
              'base64',
            ),
          ),
          parameters: [xdr.ScVal.scvString(escrowId)],
        }),
      )
      .build();

    try {
      const preparedTransaction = await this.server.prepareTransaction(tx);
      const simulatedTransaction =
        await this.server.simulateTransaction(preparedTransaction);

      if (
        !simulatedTransaction.result ||
        !simulatedTransaction.result.retval
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

  private async getSourceAccount() {
    return await this.server.getAccount(this.source.publicKey());
  }
}