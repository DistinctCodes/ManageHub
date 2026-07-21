import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Get('reference/:reference')
  async getByReference(@Param('reference') reference: string) {
    const payment = await this.paymentsService.verifyByReference(reference);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      success: true,
      data: {
        id: payment.id,
        reference: payment.reference,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        description: payment.description,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      },
    };
  }
}
