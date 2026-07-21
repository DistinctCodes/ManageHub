import { Controller, Get, Param, Post, Body, NotFoundException } from '@nestjs/common';
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
        escrowStatus: payment.escrowStatus,
        description: payment.description,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      },
    };
  }

  @Post('release/:bookingId')
  async release(@Param('bookingId') bookingId: string) {
    await this.paymentsService.releaseByBookingId(bookingId);
    return { success: true, message: 'Escrow release initiated' };
  }

  @Post('refund/:bookingId')
  async refund(@Param('bookingId') bookingId: string) {
    await this.paymentsService.refundByBookingId(bookingId);
    return { success: true, message: 'Escrow refund initiated' };
  }
}
