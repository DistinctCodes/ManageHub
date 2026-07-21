import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { SorobanEscrowProvider } from './providers/soroban-escrow.provider';
import { HandleWebhookProvider } from './providers/handle-webhook.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), HttpModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, SorobanEscrowProvider, HandleWebhookProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
