import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PaymentMethodCard } from './PaymentMethodCard';

const method = { type: 'card' as const, last4: '4242', brand: 'Visa', expiryMonth: 9, expiryYear: 2027 };
const props = { method, onRemove: vi.fn(), onUpdate: vi.fn() };

describe('PaymentMethodCard', () => {
  it('shows masked card number', () => { render(<PaymentMethodCard {...props} />); expect(screen.getByText(/•••• •••• •••• 4242/)).toBeInTheDocument(); });
  it('shows expiry as MM/YY', () => { render(<PaymentMethodCard {...props} />); expect(screen.getByText('Expires 09/27')).toBeInTheDocument(); });
  it('requires confirmation before remove', () => { render(<PaymentMethodCard {...props} />); fireEvent.click(screen.getByText('Remove')); expect(screen.getByText('Confirm Remove')).toBeInTheDocument(); expect(props.onRemove).not.toHaveBeenCalled(); });
  it('calls onUpdate immediately', () => { render(<PaymentMethodCard {...props} />); fireEvent.click(screen.getByText('Update')); expect(props.onUpdate).toHaveBeenCalled(); });
});