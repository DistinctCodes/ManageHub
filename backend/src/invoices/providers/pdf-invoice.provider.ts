import { Injectable } from '@nestjs/common';
import {
  DocumentBuilder,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
} from 'docx';
import * as PDFDocument from 'pdfkit';
import { Invoice } from '../entities/invoice.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Injectable()
export class PdfInvoiceProvider {
  async generateInvoicePdf(
    invoice: Invoice,
    booking: Booking,
    payment: Payment,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers: Buffer[] = [];

      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();

      // Invoice details
      doc.fontSize(12).text(`Invoice Number: ${invoice.invoiceNumber}`);
      doc.text(`Invoice Date: ${invoice.createdAt.toLocaleDateString()}`);
      doc.text(`Payment Date: ${invoice.paymentDate.toLocaleDateString()}`);
      doc.moveDown();

      // Customer details
      doc.fontSize(14).text('Bill To:', { underline: true });
      doc.fontSize(12).text(booking.user.fullName);
      doc.text(booking.user.email);
      doc.moveDown();

      // Workspace details
      doc.fontSize(14).text('Service Details:', { underline: true });
      doc.fontSize(12).text(`Workspace: ${booking.workspace.name}`);
      doc.text(`Plan Type: ${booking.planType}`);
      doc.text(`Seats: ${booking.seatCount}`);
      doc.text(
        `Period: ${booking.startDate.toLocaleDateString()} - ${booking.endDate.toLocaleDateString()}`,
      );
      doc.moveDown();

      // Amount details
      doc.fontSize(14).text('Payment Details:', { underline: true });
      doc
        .fontSize(12)
        .text(`Amount: ₦${(payment.amountKobo / 100).toLocaleString()}`);
      doc.text(`Payment Reference: ${payment.reference}`);
      doc.text(`Status: ${payment.status}`);
      doc.moveDown();

      // Footer
      doc
        .fontSize(10)
        .text('Thank you for your business!', { align: 'center' });
      doc.text('ManageHub - Your Workspace Management Solution', {
        align: 'center',
      });

      doc.end();
    });
  }
}
