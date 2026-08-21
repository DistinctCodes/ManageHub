import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { SandboxRailAdapter } from './adapters/sandbox-rail.adapter';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [PaymentsController],
  providers: [PaymentsService, SandboxRailAdapter],
  exports: [PaymentsService],
})
export class PaymentsModule {}
