import { Controller, Get, HttpException, HttpStatus, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { Invoice } from '../invoices/entities/invoice.entity';

@Controller('sandbox')
@UseGuards(JwtAuthGuard)
export class InvoiceSearchController {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoices: Repository<Invoice>,
  ) {}

  @Get('invoices')
  async search(
    @Req() req: any,
    @Query() q: { status?: string; from?: string; to?: string; minAmount?: string; maxAmount?: string; page?: string; limit?: string },
  ) {
    const page = Math.max(1, parseInt(q.page ?? '1'));
    const limit = Math.min(100, parseInt(q.limit ?? '20'));

    const from = q.from ? new Date(q.from) : undefined;
    const to = q.to ? new Date(q.to) : undefined;
    if ((q.from && isNaN(from!.getTime())) || (q.to && isNaN(to!.getTime()))) {
      throw new HttpException('Invalid date param', HttpStatus.BAD_REQUEST);
    }

    const minKobo = q.minAmount ? parseFloat(q.minAmount) * 100 : undefined;
    const maxKobo = q.maxAmount ? parseFloat(q.maxAmount) * 100 : undefined;
    if ((q.minAmount && isNaN(minKobo!)) || (q.maxAmount && isNaN(maxKobo!))) {
      throw new HttpException('Invalid amount param', HttpStatus.BAD_REQUEST);
    }

    const where: FindOptionsWhere<Invoice> = {};
    if (!req.user.isAdmin) where.userId = req.user.id;
    if (q.status) where.status = q.status as any;
    if (from && to) where.createdAt = Between(from, to);
    if (minKobo && maxKobo) where.amountKobo = Between(minKobo, maxKobo);

    const [data, total] = await this.invoices.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }
}
