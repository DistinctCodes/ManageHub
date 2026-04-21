import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { User } from '../users/entities/user.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { GenerateInvoiceProvider } from './providers/generate-invoice.provider';
import { FindInvoicesProvider } from './providers/find-invoices.provider';
import { PdfInvoiceProvider } from './providers/pdf-invoice.provider';
import { InvoiceSequenceProvider } from './providers/invoice-sequence.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Payment, Booking, User, Workspace]),
  ],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    GenerateInvoiceProvider,
    FindInvoicesProvider,
    PdfInvoiceProvider,
    InvoiceSequenceProvider,
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}
