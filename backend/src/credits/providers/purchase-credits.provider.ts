import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CreditPack } from '../entities/credit-pack.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { PaymentProvider } from '../../payments/enums/payment-provider.enum';
import { PaymentStatus } from '../../payments/enums/payment-status.enum';
import { PaystackProvider } from '../../payments/providers/paystack.provider';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class PurchaseCreditsProvider {
  constructor(
    @InjectRepository(CreditPack)
    private readonly creditPacksRepository: Repository<CreditPack>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly paystackProvider: PaystackProvider,
    private readonly configService: ConfigService,
  ) {}

  async purchase(
    creditPackId: string,
    userId: string,
  ): Promise<{
    paymentId: string;
    authorizationUrl: string;
    reference: string;
  }> {
    const creditPack = await this.creditPacksRepository.findOne({
      where: { id: creditPackId, isActive: true },
    });
    if (!creditPack) {
      throw new NotFoundException('Credit pack not found');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payment = this.paymentsRepository.create({
      bookingId: null,
      userId,
      amount: Number(creditPack.priceKobo),
      provider: PaymentProvider.PAYSTACK,
      status: PaymentStatus.PENDING,
      metadata: {
        type: 'credit_purchase',
        creditPackId,
        creditPackName: creditPack.name,
        creditHours: Number(creditPack.hours),
      },
    });
    const savedPayment = await this.paymentsRepository.save(payment);

    const paystackData = await this.paystackProvider.initializeTransaction(
      user.email,
      Number(creditPack.priceKobo),
      savedPayment.id,
      this.configService.get('FRONTEND_PAYMENT_CALLBACK_URL'),
      { type: 'credit_purchase', creditPackId, userId },
    );

    savedPayment.providerReference = paystackData.reference;
    await this.paymentsRepository.save(savedPayment);

    return {
      paymentId: savedPayment.id,
      authorizationUrl: paystackData.authorization_url,
      reference: paystackData.reference,
    };
  }
}
