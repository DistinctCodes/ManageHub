import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletKeyAccessLog } from '../wallets/entities/wallet-key-access-log.entity';
import { MeteredUsageEvent } from '../credits/entities/metered-usage-event.entity';
import { RetentionService } from './retention.service';

/**
 * Data-retention housekeeping (issue BE-144). Owns the scheduled job that
 * prunes `WalletKeyAccessLog` and `MeteredUsageEvent` rows older than the
 * configured window.
 */
@Module({
  imports: [TypeOrmModule.forFeature([WalletKeyAccessLog, MeteredUsageEvent])],
  providers: [RetentionService],
})
export class RetentionModule {}
