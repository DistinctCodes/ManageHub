// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { Workbook } from 'exceljs';
import { Parser } from 'json2csv';

export interface InvoiceExportFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class InvoicesExportService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
  ) {}

  private async findInvoices(filters?: InvoiceExportFilters) {
    const qb = this.invoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.user', 'user')
      .leftJoinAndSelect('invoice.booking', 'booking')
      .select([
        'invoice',
        'user.id',
        'user.firstname',
        'user.lastname',
        'user.email',
        'booking.id',
      ]);

    if (filters?.status) {
      qb.andWhere('invoice.status = :status', { status: filters.status });
    }

    if (filters?.startDate) {
      qb.andWhere('invoice.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      qb.andWhere('invoice.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    qb.orderBy('invoice.createdAt', 'DESC');
    return qb.getMany();
  }

  private mapInvoice(inv: Invoice) {
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      user: inv.user ? `${inv.user.firstname} ${inv.user.lastname}` : '',
      email: inv.user?.email ?? '',
      bookingId: inv.bookingId ?? '',
      amount: inv.amountKobo ? `₦${(inv.amountKobo / 100).toFixed(2)}` : '',
      currency: inv.currency,
      status: inv.status,
      paidAt: inv.paidAt?.toISOString() ?? '',
      createdAt: inv.createdAt?.toISOString() ?? '',
    };
  }

  async exportInvoicesCsv(filters?: InvoiceExportFilters): Promise<Buffer> {
    const invoices = await this.findInvoices(filters);
    const data = invoices.map((inv) => this.mapInvoice(inv));

    const parser = new Parser({
      fields: [
        'id',
        'invoiceNumber',
        'user',
        'email',
        'bookingId',
        'amount',
        'currency',
        'status',
        'paidAt',
        'createdAt',
      ],
    });

    return Buffer.from(parser.parse(data), 'utf-8');
  }

  async exportInvoicesExcel(filters?: InvoiceExportFilters): Promise<Buffer> {
    const invoices = await this.findInvoices(filters);

    const workbook = new Workbook();
    workbook.creator = 'ManageHub';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Invoices');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Invoice #', key: 'invoiceNumber', width: 18 },
      { header: 'User', key: 'user', width: 25 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Booking ID', key: 'bookingId', width: 38 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Paid At', key: 'paidAt', width: 22 },
      { header: 'Created At', key: 'createdAt', width: 22 },
    ];

    sheet.getRow(1).font = { bold: true };

    invoices.forEach((inv) => {
      sheet.addRow(this.mapInvoice(inv));
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
