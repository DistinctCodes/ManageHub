import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentStatus } from './enums/payment-status.enum';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
  ) {}

  async createPayment(dto: CreatePaymentDto): Promise<Payment> {
    const payment = this.paymentRepo.create(dto);
    return this.paymentRepo.save(payment);
  }

  async getPayments(page = 1, limit = 10) {
    const [data, total] = await this.paymentRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { id } });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getPaymentsByOrder(orderId: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }

  async refundPayment(id: string, dto: RefundPaymentDto): Promise<Payment> {
    const payment = await this.getPaymentById(id);

    payment.status = PaymentStatus.REFUNDED;

    payment.metadata = {
      ...(payment.metadata || {}),
      refundReason: dto.reason,
      refundedAt: new Date(),
    };

    return this.paymentRepo.save(payment);
  }

  async handleWebhook(payload: any) {
    // provider-agnostic webhook handling
    // store event metadata for tracking

    return {
      received: true,
      payload,
    };
  }
}