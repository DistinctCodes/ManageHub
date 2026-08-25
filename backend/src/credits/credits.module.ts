import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentsModule } from '../payments/payments.module';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerTransaction } from './entities/ledger-transaction.entity';
import { MeteredUsageEvent } from './entities/metered-usage-event.entity';
import { PaymentCreditApplication } from './entities/payment-credit-application.entity';
import { RevenueSplitConfig } from './entities/revenue-split-config.entity';
import { RevenueSplitRecipient } from './entities/revenue-split-recipient.entity';
import { SettlementBatch } from './entities/settlement-batch.entity';
import { SettlementPayout } from './entities/settlement-payout.entity';
import { CreditsController } from './credits.controller';
import { CreditsAdminController } from './credits-admin.controller';
import { CreditsService } from './credits.service';
import { LedgerService } from './ledger.service';
import { MeteredUsageService } from './metered-usage.service';
import { PaymentCreditsService } from './payment-credits.service';
import { RevenueSplitService } from './revenue-split.service';
import { SettlementService } from './settlement.service';

/**
 * Micropayment credit ledger and multi-party revenue distribution
 * (issue #1575).
 *
 * The dependency on PaymentsModule is one-directional and deliberate:
 * this module reads Payment rows (to fund a top-up or distribute a
 * confirmed payment) and consumes the EXTERNAL_PAYOUT_RAIL that module
 * provides over the #1574 escrow rail. The payments module knows nothing
 * about credits, which is why the payment/credit link table lives here
 * rather than as columns on `payments`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      LedgerAccount,
      LedgerTransaction,
      LedgerEntry,
      RevenueSplitConfig,
      RevenueSplitRecipient,
      SettlementBatch,
      SettlementPayout,
      MeteredUsageEvent,
      PaymentCreditApplication,
      // Read-only from this module's point of view — nothing here ever
      // changes a Payment's status; that stays the payments module's
      // guarded state machine.
      Payment,
    ]),
    PaymentsModule,
  ],
  controllers: [CreditsController, CreditsAdminController],
  providers: [
    LedgerService,
    CreditsService,
    RevenueSplitService,
    SettlementService,
    PaymentCreditsService,
    MeteredUsageService,
  ],
  exports: [LedgerService, CreditsService, RevenueSplitService],
})
export class CreditsModule {}
