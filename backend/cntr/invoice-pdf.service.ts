import PDFDocument from 'pdfkit';

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number; // in base currency units (e.g. NGN)
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string; // ISO date string e.g. "2026-06-01"
  memberName: string;
  memberEmail: string;
  lineItems: LineItem[];
}

const VAT_RATE = 0.075; // 7.5%

export function generateInvoicePDF(invoice: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('ManageHub', 50, 50);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#555555')
      .text('Workspace Management Platform', 50, 80);

    doc.moveTo(50, 100).lineTo(545, 100).strokeColor('#cccccc').stroke();
    doc.fillColor('#000000').fontSize(20).font('Helvetica-Bold').text('INVOICE', 50, 120);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 150)
      .text(`Issue Date:     ${invoice.issueDate}`, 50, 165);

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Billed To:', 50, 195)
      .font('Helvetica')
      .text(invoice.memberName, 50, 210)
      .text(invoice.memberEmail, 50, 225);

    const tableTop = 265;
    const col = { desc: 50, qty: 300, unit: 380, total: 460 };

    doc.rect(50, tableTop - 8, 495, 20).fill('#f0f0f0');

    doc
      .fillColor('#000000')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Description', col.desc, tableTop)
      .text('Qty', col.qty, tableTop)
      .text('Unit Price', col.unit, tableTop)
      .text('Total', col.total, tableTop);

    doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).strokeColor('#cccccc').stroke();

    let y = tableTop + 24;
    let subtotal = 0;

    doc.font('Helvetica').fontSize(10).fillColor('#000000');

    for (const item of invoice.lineItems) {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;

      doc
        .text(item.description, col.desc, y, { width: 230 })
        .text(String(item.quantity), col.qty, y)
        .text(formatCurrency(item.unitPrice), col.unit, y)
        .text(formatCurrency(lineTotal), col.total, y);

      y += 20;
    }

    const vat = subtotal * VAT_RATE;
    const grandTotal = subtotal + vat;

    y += 10;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#cccccc').stroke();
    y += 12;

    doc
      .font('Helvetica')
      .text('Subtotal', col.unit - 60, y)
      .text(formatCurrency(subtotal), col.total, y);

    y += 18;
    doc
      .text(`VAT (${(VAT_RATE * 100).toFixed(1)}%)`, col.unit - 60, y)
      .text(formatCurrency(vat), col.total, y);

    y += 18;
    doc.moveTo(col.unit - 60, y).lineTo(545, y).strokeColor('#000000').stroke();
    y += 10;

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Grand Total', col.unit - 60, y)
      .text(formatCurrency(grandTotal), col.total, y);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#888888')
      .text('Thank you for using ManageHub.', 50, 750, { align: 'center', width: 495 });

    doc.end();
  });
}

function formatCurrency(amount: number): string {
  return `N${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}