// src/components/WalletFundingModal.tsx
'use client';

import React, { useState } from 'react';
import { DollarSign, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from './ToastProvider';

interface WalletFundingModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const WalletFundingModal: React.FC<WalletFundingModalProps> = ({
  userId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleFundWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast('Invalid Amount', 'Please enter a valid funding amount greater than zero.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/wallets/${userId}/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsedAmount, paymentMethod }),
      });

      if (!response.ok) {
        throw new Error('Failed to process wallet funding request.');
      }

      toast('Funding Successful', `Successfully added $${parsedAmount.toFixed(2)} to wallet.`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast('Funding Failed', err.message || 'An error occurred while funding the wallet.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-indigo-600" />
            Fund Wallet
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm font-medium"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleFundWallet} className="space-y-4">
          <div>
            <label htmlFor="funding-amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount (USD)
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                $
              </div>
              <input
                id="funding-amount"
                type="number"
                step="0.01"
                min="1"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
            >
              <option value="card">Credit / Debit Card</option>
              <option value="bank_transfer">Direct Bank Transfer</option>
              <option value="ach">ACH Transfer</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Funding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};