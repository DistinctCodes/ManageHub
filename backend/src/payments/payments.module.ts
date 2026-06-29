import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { User } from '../users/entities/user.entity';
import { UserCredit } from '../credits/entities/user-credit.entity';
import { UserCreditTransaction } from '../credits/entities/credit-transaction.entity';
import { CreditPack } from '../credits/entities/credit-pack.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaystackProvider } from './providers/paystack.provider';
import { SorobanEscrowProvider } from './providers/soroban-escrow.provider';
import { InitializePaymentProvider } from './providers/initialize-payment.provider';
import { HandleWebhookProvider } from './providers/handle-webhook.provider';
import { RefundPaymentProvider } from './providers/refund-payment.provider';
import { FindPaymentsProvider } from './providers/find-payments.provider';
import { BookingsModule } from '../bookings/bookings.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Booking, User, UserCredit, UserCreditTransaction, CreditPack]),
    BookingsModule,
    InvoicesModule,
    NotificationsModule,
    PromoCodesModule,
    ReferralsModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaystackProvider,
    SorobanEscrowProvider,
    InitializePaymentProvider,
    HandleWebhookProvider,
    RefundPaymentProvider,
    FindPaymentsProvider,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
