import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPayments(params: {
    userId: string;
    role: string;
    page: number;
    limit: number;
    status?: string;
  }) {
    const { userId, role, page, limit, status } = params;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (role === 'USER') {
      where.userId = userId;
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          user: true,
          booking: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      success: true,
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentById(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        user: true,
        booking: true,
      },
    });
  }
}