import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { Invoice } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';
import { InvoiceStatus } from './enums/invoice-status.enum';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
  ) {}

  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}`;

    const count = await this.invoiceRepo.count();

    const sequence = (count + 1)
      .toString()
      .padStart(4, '0');

    return `INV-${yearMonth}-${sequence}`;
  }

  async createInvoice(dto: CreateInvoiceDto): Promise<Invoice> {
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = this.invoiceRepo.create({
      ...dto,
      invoiceNumber,
      status: InvoiceStatus.DRAFT,
    });

    return this.invoiceRepo.save(invoice);
  }

  async getInvoices(
    page = 1,
    limit = 10,
    filter?: FilterInvoiceDto,
  ) {
    const where: any = {};

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.startDate && filter?.endDate) {
      where.issuedAt = Between(
        filter.startDate,
        filter.endDate,
      );
    }

    const [data, total] = await this.invoiceRepo.findAndCount({
      where,
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

  async getInvoice(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async downloadInvoice(id: string) {
    const invoice = await this.getInvoice(id);

    return {
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.issuedAt,
      dueAt: invoice.dueAt,
      items: invoice.items,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      currency: invoice.currency,
      notes: invoice.notes,
      userId: invoice.userId,
      orderId: invoice.orderId,
      paymentId: invoice.paymentId,
    };
  }

  async sendInvoice(id: string) {
    const invoice = await this.getInvoice(id);

    invoice.status = InvoiceStatus.SENT;

    await this.invoiceRepo.save(invoice);

    return {
      message: 'Invoice marked as sent',
      invoice,
    };
  }

  async voidInvoice(id: string) {
    const invoice = await this.getInvoice(id);

    invoice.status = InvoiceStatus.VOID;

    return this.invoiceRepo.save(invoice);
  }
}