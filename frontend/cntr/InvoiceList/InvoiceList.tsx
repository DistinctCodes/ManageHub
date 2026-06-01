import React from 'react';
import { Download } from 'lucide-react';

interface Invoice { id: string; invoiceNumber: string; amountKobo: number; status: string; createdAt: string; bookingId: string; }
interface Props { invoices: Invoice[]; onDownload: (id: string) => void; isLoading?: boolean; }

export function InvoiceList({ invoices, onDownload, isLoading }: Props) {
  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}</div>;
  if (!invoices.length) return <p className="text-center text-muted-foreground py-8">No invoices found.</p>;
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b"><th className="text-left py-2">Invoice</th><th>Amount</th><th>Status</th><th>Date</th><th /></tr></thead>
      <tbody>
        {invoices.map((inv) => (
          <tr key={inv.id} className="border-b">
            <td className="py-2">{inv.invoiceNumber}</td>
            <td className="text-center">₦{(inv.amountKobo / 100).toLocaleString('en-NG')}</td>
            <td className="text-center">{inv.status}</td>
            <td className="text-center">{new Date(inv.createdAt).toLocaleDateString()}</td>
            <td className="text-right"><button onClick={() => onDownload(inv.id)} aria-label="Download"><Download size={16} /></button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}