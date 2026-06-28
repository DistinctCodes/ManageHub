import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { DunningService } from './dunning.service';

@Module({
  imports: [BillingModule],
  providers: [DunningService],
})
export class DunningModule {}
