import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InvoiceList } from './InvoiceList';

const invoices = [{ id: '1', invoiceNumber: 'INV-001', amountKobo: 500000, status: 'PAID', createdAt: '2024-01-01', bookingId: 'b1' }];

describe('InvoiceList', () => {
  it('shows skeleton when loading', () => { const { container } = render(<InvoiceList invoices={[]} onDownload={vi.fn()} isLoading />); expect(container.querySelector('.animate-pulse')).toBeTruthy(); });
  it('shows empty state', () => { render(<InvoiceList invoices={[]} onDownload={vi.fn()} />); expect(screen.getByText(/No invoices/)).toBeInTheDocument(); });
  it('renders invoice row', () => { render(<InvoiceList invoices={invoices} onDownload={vi.fn()} />); expect(screen.getByText('INV-001')).toBeInTheDocument(); });
  it('formats amount in naira', () => { render(<InvoiceList invoices={invoices} onDownload={vi.fn()} />); expect(screen.getByText(/5,000/)).toBeInTheDocument(); });
});