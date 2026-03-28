import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { PaymentStatus } from '../../payments/enums/payment-status.enum';
import { EmailService } from '../../email/email.service';
import { PdfInvoiceProvider } from './pdf-invoice.provider';

@Injectable()
export class GenerateInvoiceProvider {
  private readonly logger = new Logger(GenerateInvoiceProvider.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly emailService: EmailService,
    private readonly pdfInvoiceProvider: PdfInvoiceProvider,
  ) {}

  async generateInvoice(paymentId: string): Promise<Invoice> {
    // Find the successful payment
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, status: PaymentStatus.SUCCESS },
      relations: ['booking', 'booking.user', 'booking.workspace'],
    });

    if (!payment) {
      throw new Error('Payment not found or not successful');
    }

    // Check if invoice already exists
    const existingInvoice = await this.invoiceRepo.findOne({
      where: { paymentId },
    });
    if (existingInvoice) {
      return existingInvoice;
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${payment.bookingId.slice(-8)}`;

    // Create invoice record
    const invoice = this.invoiceRepo.create({
      invoiceNumber,
      userId: payment.userId,
      bookingId: payment.bookingId,
      paymentId: payment.id,
      amountKobo: payment.amountKobo,
      paymentDate: payment.paidAt || new Date(),
    });

    const savedInvoice = await this.invoiceRepo.save(invoice);

    // Generate PDF and send email
    this.generateAndSendInvoice(savedInvoice, payment.booking, payment).catch(
      () => {
        // Fail silently as per requirements
        this.logger.warn(
          `Failed to generate and send invoice ${invoiceNumber}`,
          {
            invoiceId: savedInvoice.id,
          },
        );
      },
    );

    return savedInvoice;
  }

  private async generateAndSendInvoice(
    invoice: Invoice,
    booking: Booking,
    payment: Payment,
  ): Promise<void> {
    // Generate PDF
    const pdfBuffer = await this.pdfInvoiceProvider.generateInvoicePdf(
      invoice,
      booking,
      payment,
    );

    // Send email with attachment
    await this.emailService.sendInvoiceReadyEmail(
      booking.user.email,
      booking.user.fullName,
      {
        invoiceNumber: invoice.invoiceNumber,
        workspaceName: booking.workspace.name,
        amount: (payment.amountKobo / 100).toLocaleString(),
        paymentDate: invoice.paymentDate.toLocaleDateString(),
      },
      pdfBuffer,
    );

    this.logger.log(
      `Invoice ${invoice.invoiceNumber} sent to ${booking.user.email}`,
    );
  }
}
