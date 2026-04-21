import { Injectable } from '@nestjs/common';
import { GenerateInvoiceProvider } from './providers/generate-invoice.provider';
import { FindInvoicesProvider } from './providers/find-invoices.provider';
import { PdfInvoiceProvider } from './providers/pdf-invoice.provider';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { UserRole } from '../users/enums/userRoles.enum';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly generateInvoiceProvider: GenerateInvoiceProvider,
    private readonly findInvoicesProvider: FindInvoicesProvider,
    private readonly pdfInvoiceProvider: PdfInvoiceProvider,
  ) {}

  generateForPayment(paymentId: string) {
    return this.generateInvoiceProvider.generateForPayment(paymentId);
  }

  findAll(
    query: InvoiceQueryDto,
    userId: string,
    userRole: UserRole,
  ) {
    return this.findInvoicesProvider.findAll(query, userId, userRole);
  }

  findById(invoiceId: string, userId: string, userRole: UserRole) {
    return this.findInvoicesProvider.findById(invoiceId, userId, userRole);
  }

  async downloadPdf(
    invoiceId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ pdf: Buffer; invoiceNumber: string }> {
    const invoice = await this.findInvoicesProvider.findById(
      invoiceId,
      userId,
      userRole,
    );
    const pdf = await this.pdfInvoiceProvider.generate(invoice);
    return { pdf, invoiceNumber: invoice.invoiceNumber };
  }
}
