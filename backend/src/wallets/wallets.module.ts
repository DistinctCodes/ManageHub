import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletAccount } from './entities/wallet-account.entity';
import { WalletKeyMaterial } from './entities/wallet-key-material.entity';
import { WalletKeyAccessLog } from './entities/wallet-key-access-log.entity';
import { WalletLinkChallenge } from './entities/wallet-link-challenge.entity';
import { WalletLedgerEntry } from './entities/wallet-ledger-entry.entity';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { KeyCustodyService } from './key-custody/key-custody.service';
import { EnvelopeKeyManagementService } from './key-custody/key-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletAccount,
      WalletKeyMaterial,
      WalletKeyAccessLog,
      WalletLinkChallenge,
      WalletLedgerEntry,
    ]),
  ],
  controllers: [WalletsController],
  providers: [WalletsService, KeyCustodyService, EnvelopeKeyManagementService],
  exports: [WalletsService],
})
export class WalletsModule {}
