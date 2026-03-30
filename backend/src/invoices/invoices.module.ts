import { Module } from '@nestjs/common';
import { PdfInvoiceProvider } from './providers/pdf-invoice.provider';

@Module({
  providers: [PdfInvoiceProvider],
  exports: [PdfInvoiceProvider],
})
export class InvoicesModule {}
