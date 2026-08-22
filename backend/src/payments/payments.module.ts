import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { ConfirmationEvent } from './entities/confirmation-event.entity';
import { Refund } from './entities/refund.entity';
import { PaymentsService } from './payments.service';
import { PaymentConfirmationService } from './payment-confirmation.service';
import { ReconciliationService } from './reconciliation.service';
import { RefundsService } from './refunds.service';
import { PaymentsGateway } from './payments.gateway';
import { PaymentsController } from './payments.controller';
import { PaymentWebhookController } from './payment-webhook.controller';
import { PaymentsAdminController } from './payments-admin.controller';
import { SandboxRailAdapter } from './adapters/sandbox-rail.adapter';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, ConfirmationEvent, Refund])],
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
    PaymentsGateway,
    SandboxRailAdapter,
  ],
  exports: [PaymentsService, PaymentConfirmationService, ReconciliationService],
})
export class PaymentsModule {}
