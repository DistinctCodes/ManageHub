import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPayment(dto);
  }

  @Get()
  getPayments(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.paymentsService.getPayments(Number(page), Number(limit));
  }

  @Get(':id')
  getPayment(@Param('id') id: string) {
    return this.paymentsService.getPaymentById(id);
  }

  @Get('order/:orderId')
  getPaymentsByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentsByOrder(orderId);
  }

  @Post(':id/refund')
  refundPayment(
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.refundPayment(id, dto);
  }

  @Post('webhook')
  handleWebhook(@Req() req: any) {
    return this.paymentsService.handleWebhook(req.body);
  }
}