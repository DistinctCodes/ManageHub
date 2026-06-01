import { generateInvoicePDF, InvoiceData } from './invoice-pdf.service';

const sampleInvoice: InvoiceData = {
  invoiceNumber: 'INV-2026-001',
  issueDate: '2026-06-01',
  memberName: 'Amina Bello',
  memberEmail: 'amina.bello@example.com',
  lineItems: [
    { description: 'Hot Desk – May 2026', quantity: 1, unitPrice: 15000 },
    { description: 'Meeting Room Booking (2 hrs)', quantity: 2, unitPrice: 5000 },
    { description: 'Printing Credits', quantity: 10, unitPrice: 200 },
  ],
};

describe('generateInvoicePDF', () => {
  it('returns a non-empty Buffer', async () => {
    const buffer = await generateInvoicePDF(sampleInvoice);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('starts with %PDF bytes (valid PDF format)', async () => {
    const buffer = await generateInvoicePDF(sampleInvoice);
    const header = buffer.slice(0, 4).toString('ascii');
    expect(header).toBe('%PDF');
  });

  it('produces a larger buffer when there are more line items', async () => {
    const fewItems: InvoiceData = { ...sampleInvoice, lineItems: [sampleInvoice.lineItems[0]] };
    const manyItems: InvoiceData = {
      ...sampleInvoice,
      lineItems: Array.from({ length: 20 }, (_, i) => ({
        description: `Item ${i + 1}`,
        quantity: i + 1,
        unitPrice: 1000,
      })),
    };
    const small = await generateInvoicePDF(fewItems);
    const large = await generateInvoicePDF(manyItems);
    expect(large.length).toBeGreaterThan(small.length);
  });

  it('handles an invoice with a single line item', async () => {
    const single: InvoiceData = {
      ...sampleInvoice,
      lineItems: [{ description: 'Private Office – June 2026', quantity: 1, unitPrice: 80000 }],
    };
    const buffer = await generateInvoicePDF(single);
    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(0);
  });
});