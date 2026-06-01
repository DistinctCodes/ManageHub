import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';

interface PaymentMethod { type: 'card' | 'bank'; last4: string; brand?: string; expiryMonth?: number; expiryYear?: number; }
interface Props { method: PaymentMethod; onRemove: () => void; onUpdate: () => void; }

export function PaymentMethodCard({ method, onRemove, onUpdate }: Props) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const expiry = method.expiryMonth && method.expiryYear
    ? `${String(method.expiryMonth).padStart(2, '0')}/${String(method.expiryYear).slice(-2)}`
    : null;

  return (
    <div className="border rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CreditCard size={20} />
        <div>
          <p className="font-medium text-sm">{method.brand ?? method.type.toUpperCase()} •••• •••• •••• {method.last4}</p>
          {expiry && <p className="text-xs text-muted-foreground">Expires {expiry}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onUpdate} className="text-sm text-blue-600">Update</button>
        {confirmRemove ? (
          <button onClick={onRemove} className="text-sm text-red-600 font-semibold">Confirm Remove</button>
        ) : (
          <button onClick={() => setConfirmRemove(true)} className="text-sm text-red-500">Remove</button>
        )}
      </div>
    </div>
  );
}