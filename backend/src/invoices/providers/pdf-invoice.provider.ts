import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Invoice } from '../../payments/entities/invoice.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';

interface InvoiceWithRelations extends Invoice {
  user: User;
  booking: Booking & {
    workspace: Workspace;
  };
}

@Injectable()
export class PdfInvoiceProvider {
  async generate(invoice: InvoiceWithRelations): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => {
          chunks.push(chunk);
        });

        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        doc.on('error', (error) => {
          reject(error);
        });

        // Header Section
        this.addHeader(doc);

        // Invoice Metadata Section
        this.addInvoiceMetadata(doc, invoice);

        // Bill To Section
        this.addBillToSection(doc, invoice.user);

        // Service Details Section
        this.addServiceDetails(doc, invoice.booking);

        // Amount Summary Section
        this.addAmountSummary(doc, invoice);

        // Footer Section
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(doc: typeof PDFDocument): void {
    // ManageHub logo/name
    doc.fontSize(24).font('Helvetica-Bold').text('ManageHub', 50, 50);
    
    // TAX INVOICE title
    doc.fontSize(18).font('Helvetica-Bold').text('TAX INVOICE', 50, 85);
    
    // Add a line under the header
    doc.moveTo(50, 110).lineTo(545, 110).stroke();
  }

  private addInvoiceMetadata(doc: typeof PDFDocument, invoice: InvoiceWithRelations): void {
    const yPosition = 130;
    
    doc.fontSize(12).font('Helvetica');
    
    // Invoice Number
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 50, yPosition);
    
    // Issue Date
    doc.text(`Issue Date: ${invoice.createdAt.toLocaleDateString()}`, 50, yPosition + 20);
    
    // Payment Date (if paid)
    if (invoice.paidAt) {
      doc.text(`Payment Date: ${invoice.paidAt.toLocaleDateString()}`, 50, yPosition + 40);
    }
    
    // Due Date
    if (invoice.dueDate) {
      doc.text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, 50, yPosition + 60);
    }
  }

  private addBillToSection(doc: typeof PDFDocument, user: User): void {
    const yPosition = 220;
    
    doc.fontSize(14).font('Helvetica-Bold').text('Bill To:', 50, yPosition);
    
    doc.fontSize(12).font('Helvetica');
    
    // Member's full name
    const fullName = user.fullName || user.email;
    doc.text(fullName, 50, yPosition + 25);
    
    // Email address
    doc.text(user.email, 50, yPosition + 45);
  }

  private addServiceDetails(doc: typeof PDFDocument, booking: Booking & { workspace: Workspace }): void {
    const yPosition = 320;
    
    doc.fontSize(14).font('Helvetica-Bold').text('Service Details:', 50, yPosition);
    
    doc.fontSize(12).font('Helvetica');
    
    // Workspace name
    doc.text(`Workspace: ${booking.workspace.name}`, 50, yPosition + 25);
    
    // Plan type
    doc.text(`Plan Type: ${booking.workspace.type}`, 50, yPosition + 45);
    
    // Start date
    doc.text(`Start Date: ${booking.startDate.toLocaleDateString()}`, 50, yPosition + 65);
    
    // End date
    doc.text(`End Date: ${booking.endDate.toLocaleDateString()}`, 50, yPosition + 85);
    
    // Number of seats
    doc.text(`Number of Seats: ${booking.seatCount}`, 50, yPosition + 105);
  }

  private addAmountSummary(doc: typeof PDFDocument, invoice: InvoiceWithRelations): void {
    const yPosition = 460;
    
    doc.fontSize(14).font('Helvetica-Bold').text('Amount Summary:', 50, yPosition);
    
    doc.fontSize(12).font('Helvetica');
    
    // Subtotal (same as total for now, but keeping structure)
    const subtotal = invoice.amountKobo / 100; // Convert from kobo to Naira
    doc.text(`Subtotal: ₦${subtotal.toFixed(2)}`, 50, yPosition + 25);
    
    // Total amount
    doc.font('Helvetica-Bold').text(`Total Amount: ₦${subtotal.toFixed(2)}`, 50, yPosition + 45);
    
    // Status
    const statusColor = invoice.status === 'PAID' ? 'green' : 'red';
    doc.fillColor(statusColor).text(`Status: ${invoice.status}`, 50, yPosition + 65);
    doc.fillColor('black'); // Reset color
  }

  private addFooter(doc: typeof PDFDocument): void {
    // Move to bottom of page
    doc.fontSize(10).font('Helvetica-Oblique');
    
    const footerText = 'Thank you for your business';
    const textWidth = doc.widthOfString(footerText);
    const centerX = (doc.page.width - textWidth) / 2;
    
    doc.text(footerText, centerX, doc.page.height - 80, { align: 'center' });
  }
}
