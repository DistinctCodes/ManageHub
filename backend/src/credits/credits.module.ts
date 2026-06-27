import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditPack } from './entities/credit-pack.entity';
import { UserCredit } from './entities/user-credit.entity';
import { UserCreditTransaction } from './entities/credit-transaction.entity';
import { Payment } from '../payments/entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { CreditsService } from './credits.service';
import { CreditsController } from './credits.controller';
import { GetCreditPacksProvider } from './providers/get-credit-packs.provider';
import { PurchaseCreditsProvider } from './providers/purchase-credits.provider';
import { GetCreditBalanceProvider } from './providers/get-credit-balance.provider';
import { GetCreditHistoryProvider } from './providers/get-credit-history.provider';
import { PaystackProvider } from '../payments/providers/paystack.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CreditPack,
      UserCredit,
      UserCreditTransaction,
      Payment,
      User,
    ]),
  ],
  controllers: [CreditsController],
  providers: [
    CreditsService,
    GetCreditPacksProvider,
    PurchaseCreditsProvider,
    GetCreditBalanceProvider,
    GetCreditHistoryProvider,
    PaystackProvider,
  ],
  exports: [CreditsService],
})
export class CreditsModule {}
