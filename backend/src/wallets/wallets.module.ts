import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { WalletAccount } from './entities/wallet-account.entity';
import { WalletKeyMaterial } from './entities/wallet-key-material.entity';
import { WalletKeyAccessLog } from './entities/wallet-key-access-log.entity';
import { WalletLinkChallenge } from './entities/wallet-link-challenge.entity';
import { WalletLedgerEntry } from './entities/wallet-ledger-entry.entity';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { WalletLinkIdempotencyService } from './wallet-link-idempotency.service';
import { walletRedisClientProvider } from './redis-client.provider';
import { KeyCustodyService } from './key-custody/key-custody.service';
import { EnvelopeKeyManagementService } from './key-custody/key-management.service';
import { KeyRotationService } from './key-custody/key-rotation.service';
import { KeyRotationController } from './key-custody/key-rotation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletAccount,
      WalletKeyMaterial,
      WalletKeyAccessLog,
      WalletLinkChallenge,
      WalletLedgerEntry,
    ]),
    AdminAuditModule,
  ],
  controllers: [WalletsController, KeyRotationController],
  providers: [
    WalletsService,
    KeyCustodyService,
    EnvelopeKeyManagementService,
    KeyRotationService,
    WalletLinkIdempotencyService,
    walletRedisClientProvider,
  ],
  exports: [WalletsService],
})
export class WalletsModule {}
