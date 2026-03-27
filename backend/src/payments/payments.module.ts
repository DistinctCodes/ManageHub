import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Payment } from "./entities/payment.entity";
import { PaymentsService } from "./providers/payments.service";
import { PaymentsController } from "./payments.controller";
import { InitiatePaymentProvider } from "./providers/initiate-payment.provider";
import { HandleWebhookProvider } from "./providers/handle-webhook.provider";

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  providers: [PaymentsService, InitiatePaymentProvider, HandleWebhookProvider],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
