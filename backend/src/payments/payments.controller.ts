import {
  Controller,
  Get,
  Param,
  Query,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async getPayments(
    @GetCurrentUser('id') userId: string,
    @GetCurrentUser('role') role: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
  ) {
    return this.paymentsService.getPayments({
      userId,
      role,
      page: Number(page),
      limit: Number(limit),
      status,
    });
  }

  @Get(':id')
  async getPaymentById(
    @Param('id') id: string,
    @GetCurrentUser('id') userId: string,
    @GetCurrentUser('role') role: string,
  ) {
    const payment = await this.paymentsService.getPaymentById(id);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (
      role === 'USER' &&
      payment.userId !== userId
    ) {
      throw new ForbiddenException();
    }

    return {
      success: true,
      data: payment,
    };
  }
}