import { Injectable } from '@nestjs/common';
import { Invoice } from '../entities/invoice.entity';
// pdfkit is a CommonJS module; use require() to avoid ESM interop issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

@Injectable()
export class PdfInvoiceProvider {
  /**
   * Generates a PDF buffer for the given invoice.
   */
  generate(invoice: Invoice): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderPdf(doc, invoice);
      doc.end();
    });
  }

  private renderPdf(doc: PDFKit.PDFDocument, invoice: Invoice): void {
    const amountNaira = (invoice.amountKobo / 100).toFixed(2);

    // Header
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('ManageHub', 50, 50)
      .fontSize(10)
      .font('Helvetica')
      .text('Coworking Space Management', 50, 76)
      .moveDown(2);

    // Invoice meta
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('INVOICE', { align: 'right' })
      .fontSize(10)
      .font('Helvetica')
      .text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' })
      .text(
        `Date: ${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : '—'}`,
        { align: 'right' },
      )
      .text(
        `Status: ${invoice.status.toUpperCase()}`,
        { align: 'right' },
      )
      .moveDown(2);

    // Divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(1);

    // Line items table header
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Description', 50, doc.y, { width: 300 })
      .text('Amount', 350, doc.y - doc.currentLineHeight(), {
        width: 195,
        align: 'right',
      })
      .moveDown(0.5);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

    // Line items
    const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    doc.font('Helvetica');

    if (lineItems.length === 0) {
      const lineY = doc.y;
      doc.text('Workspace booking', 50, lineY, { width: 300 });
      doc.text(`₦${amountNaira}`, 350, lineY, {
        width: 195,
        align: 'right',
      });
      doc.moveDown(0.5);
    } else {
      for (const item of lineItems) {
        const desc = String(item['description'] ?? 'Workspace booking');
        const itemAmount = item['amountNaira']
          ? Number(item['amountNaira']).toFixed(2)
          : amountNaira;
        const lineY = doc.y;
        doc.text(desc, 50, lineY, { width: 300 });
        doc.text(`₦${itemAmount}`, 350, lineY, {
          width: 195,
          align: 'right',
        });
        if (item['startDate'] && item['endDate']) {
          doc
            .fontSize(9)
            .fillColor('#666666')
            .text(
              `${item['startDate']} → ${item['endDate']}`,
              50,
              doc.y,
              { width: 300 },
            )
            .fillColor('#000000')
            .fontSize(10);
        }
        doc.moveDown(0.5);
      }
    }

    // Total
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

    doc
      .font('Helvetica-Bold')
      .text('Total', 50, doc.y, { width: 300 })
      .text(`₦${amountNaira}`, 350, doc.y - doc.currentLineHeight(), {
        width: 195,
        align: 'right',
      })
      .moveDown(2);

    // Footer
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#999999')
      .text('Thank you for choosing ManageHub.', { align: 'center' });
  }
}
