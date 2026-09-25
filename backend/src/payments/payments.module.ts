import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BullModule } from '@nestjs/bull';
import { Payment } from './entities/payment.entity';
import { ConfirmationEvent } from './entities/confirmation-event.entity';
import { Refund } from './entities/refund.entity';
import { PaymentWebhookDeadLetter } from './entities/payment-webhook-dead-letter.entity';
import { PaymentsService } from './payments.service';
import { PaymentConfirmationService } from './payment-confirmation.service';
import { PaymentWebhookDeadLetterService } from './payment-webhook-dead-letter.service';
import { ReconciliationService } from './reconciliation.service';
import { RefundsService } from './refunds.service';
import { PaymentRailRegistry } from './payment-rail-registry';
import { PaymentsGateway } from './payments.gateway';
import { PaymentRail } from './enums/payment-rail.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentsController } from './payments.controller';
import { PaymentWebhookController } from './payment-webhook.controller';
import { PaymentsAdminController } from './payments-admin.controller';
import { SandboxRailAdapter } from './adapters/sandbox-rail.adapter';
import { WalletsModule } from '../wallets/wallets.module';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { loadSorobanConfig } from './soroban/soroban-config';
import { SorobanRailAdapter } from './soroban/soroban-rail.adapter';
import { SorobanPayoutAdapter } from './soroban/soroban-payout.adapter';
import { EXTERNAL_PAYOUT_RAIL } from '../credits/credits.tokens';
import { EscrowSubmissionProcessor } from './soroban/escrow-submission.processor';
import { EscrowContractClient } from './soroban/escrow-contract.client';
import { createLazy } from './soroban/lazy-initialization';
import {
  SorobanRpcClient,
  createSorobanRpcServer,
} from './soroban/soroban-rpc-client';
import {
  ESCROW_CONTRACT_CLIENT,
  SOROBAN_CONFIG,
  SOROBAN_ESCROW_QUEUE,
  SOROBAN_RAIL_ADAPTER,
} from './soroban/soroban.tokens';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      ConfirmationEvent,
      Refund,
      PaymentWebhookDeadLetter,
    ]),
    WalletsModule,
    AdminAuditModule,
    BullModule.registerQueue({ name: SOROBAN_ESCROW_QUEUE }),
  ],
  controllers: [
    PaymentsController,
    PaymentWebhookController,
    PaymentsAdminController,
  ],
  providers: [
    PaymentsService,
    PaymentConfirmationService,
    PaymentWebhookDeadLetterService,
    ReconciliationService,
    RefundsService,
    PaymentRailRegistry,
    PaymentsGateway,
    SandboxRailAdapter,
    // The Soroban escrow rail (issue #1574): every provider below
    // resolves to null unless SOROBAN_ENABLED=true and every required
    // STELLAR_* variable is set (see soroban-config.ts) — including
    // SOROBAN_RAIL_ADAPTER itself, which is what PaymentRailRegistry
    // checks. A disabled rail never makes an RPC call or touches a
    // wallet; it's simply unavailable, with a clear error if selected.
    {
      provide: SOROBAN_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => loadSorobanConfig(config),
    },
    {
      provide: SorobanRpcClient,
      inject: [SOROBAN_CONFIG],
      // Resolve a lazy proxy while keeping the disabled case a literal null;
      // the RPC SDK servers and SorobanRpcClient constructor are not touched
      // until a consumer actually accesses the client.
      useFactory: (sorobanConfig: ReturnType<typeof loadSorobanConfig>) => {
        if (!sorobanConfig) {
          return null;
        }
        const config = sorobanConfig;
        return createLazy(
          () =>
            new SorobanRpcClient(config.rpcUrls.map(createSorobanRpcServer)),
        );
      },
    },
    {
      provide: ESCROW_CONTRACT_CLIENT,
      inject: [SOROBAN_CONFIG, SorobanRpcClient],
      // The contract client is lazy for the same reason as the RPC client;
      // its constructor only stores dependencies, so the first real method
      // call is the first point at which either SDK-backed object is built.
      useFactory: (
        sorobanConfig: ReturnType<typeof loadSorobanConfig>,
        rpcClient: SorobanRpcClient | null,
      ) => {
        const config = sorobanConfig;
        const client = rpcClient;
        if (!config || !client) {
          return null;
        }
        return createLazy(
          () =>
            new EscrowContractClient(
              client,
              config.contractId,
              config.networkPassphrase,
            ),
        );
      },
    },
    {
      provide: SOROBAN_RAIL_ADAPTER,
      inject: [SOROBAN_CONFIG, SorobanRailAdapter],
      useFactory: (
        sorobanConfig: ReturnType<typeof loadSorobanConfig>,
        adapter: SorobanRailAdapter,
      ) => (sorobanConfig ? adapter : null),
    },
    // The credit ledger's off-platform payout port (issue #1575),
    // implemented over the escrow rail above. Same conditional shape:
    // null unless the Soroban rail is actually configured, which
    // SettlementService treats as "no external payouts are possible" —
    // batches keep their payouts PENDING and say so, rather than silently
    // marking a balance as paid.
    {
      provide: EXTERNAL_PAYOUT_RAIL,
      inject: [SOROBAN_CONFIG, SorobanPayoutAdapter],
      useFactory: (
        sorobanConfig: ReturnType<typeof loadSorobanConfig>,
        adapter: SorobanPayoutAdapter,
      ) => (sorobanConfig ? adapter : null),
    },
    SorobanRailAdapter,
    SorobanPayoutAdapter,
    EscrowSubmissionProcessor,
  ],
  exports: [
    PaymentsService,
    PaymentConfirmationService,
    ReconciliationService,
    EXTERNAL_PAYOUT_RAIL,
  ],
})
export class PaymentsModule implements OnModuleInit {
  private readonly logger = new Logger(PaymentsModule.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const sorobanEnabled =
      this.configService.get<string>('SOROBAN_ENABLED', 'false') === 'true';

    if (sorobanEnabled) return;

    const unresolvedCount = await this.paymentRepo.count({
      where: {
        rail: In([PaymentRail.STELLAR_CUSTODIAL, PaymentRail.STELLAR_EXTERNAL]),
        status: PaymentStatus.AWAITING_CONFIRMATION,
      },
    });

    if (unresolvedCount > 0) {
      this.logger.warn(
        `SOROBAN_ENABLED is false but ${unresolvedCount} on-chain escrow(s) ` +
          `are still AWAITING_CONFIRMATION. These funds are locked on-chain ` +
          `and must be resolved manually. See contracts/RUNBOOK.md.`,
      );
    }
  }
}
