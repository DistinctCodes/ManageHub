import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Payment } from './entities/payment.entity';
import { ConfirmationEvent } from './entities/confirmation-event.entity';
import { Refund } from './entities/refund.entity';
import { PaymentsService } from './payments.service';
import { PaymentConfirmationService } from './payment-confirmation.service';
import { ReconciliationService } from './reconciliation.service';
import { RefundsService } from './refunds.service';
import { PaymentRailRegistry } from './payment-rail-registry';
import { PaymentsGateway } from './payments.gateway';
import { PaymentsController } from './payments.controller';
import { PaymentWebhookController } from './payment-webhook.controller';
import { PaymentsAdminController } from './payments-admin.controller';
import { SandboxRailAdapter } from './adapters/sandbox-rail.adapter';
import { WalletsModule } from '../wallets/wallets.module';
import { loadSorobanConfig } from './soroban/soroban-config';
import { SorobanRailAdapter } from './soroban/soroban-rail.adapter';
import { SorobanPayoutAdapter } from './soroban/soroban-payout.adapter';
import { EXTERNAL_PAYOUT_RAIL } from '../credits/credits.tokens';
import { EscrowSubmissionProcessor } from './soroban/escrow-submission.processor';
import { EscrowContractClient } from './soroban/escrow-contract.client';
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
    TypeOrmModule.forFeature([Payment, ConfirmationEvent, Refund]),
    WalletsModule,
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
      useFactory: (sorobanConfig: ReturnType<typeof loadSorobanConfig>) =>
        sorobanConfig
          ? new SorobanRpcClient(
              sorobanConfig.rpcUrls.map(createSorobanRpcServer),
            )
          : null,
    },
    {
      provide: ESCROW_CONTRACT_CLIENT,
      inject: [SOROBAN_CONFIG, SorobanRpcClient],
      useFactory: (
        sorobanConfig: ReturnType<typeof loadSorobanConfig>,
        rpcClient: SorobanRpcClient | null,
      ) =>
        sorobanConfig && rpcClient
          ? new EscrowContractClient(
              rpcClient,
              sorobanConfig.contractId,
              sorobanConfig.networkPassphrase,
            )
          : null,
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
export class PaymentsModule {}
