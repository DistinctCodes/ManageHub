import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { ConfirmationEvent } from './entities/confirmation-event.entity';
import { PaymentsService } from './payments.service';
import { PaymentConfirmationService } from './payment-confirmation.service';
import { PaymentsGateway } from './payments.gateway';
import { PaymentsController } from './payments.controller';
import { PaymentWebhookController } from './payment-webhook.controller';
import { SandboxRailAdapter } from './adapters/sandbox-rail.adapter';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, ConfirmationEvent])],
  controllers: [PaymentsController, PaymentWebhookController],
  providers: [
    PaymentsService,
    PaymentConfirmationService,
    PaymentsGateway,
    SandboxRailAdapter,
  ],
  exports: [PaymentsService, PaymentConfirmationService],
})
export class PaymentsModule {}
