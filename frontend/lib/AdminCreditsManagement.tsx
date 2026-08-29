// src/components/AdminCreditsManagement.tsx
'use client';

import React, { useState } from 'react';
import { Sliders, ArrowUpRight, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from './ToastProvider';

export default function AdminCreditsManagement() {
  const [userId, setUserId] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleManualAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/credits/admin/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: parseFloat(adjustmentAmount), reason: adjustmentReason }),
      });
      if (!res.ok) throw new Error('Failed to process manual adjustment.');
      toast('Success', 'Manual credit adjustment applied successfully.', 'success');
      setUserId('');
      setAdjustmentAmount('');
      setAdjustmentReason('');
    } catch (err: any) {
      toast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/credits/admin/payments/${paymentId}/top-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(topUpAmount) }),
      });
      if (!res.ok) throw new Error('Failed to trigger payment top-up.');
      toast('Success', 'Payment top-up triggered successfully.', 'success');
      setPaymentId('');
      setTopUpAmount('');
    } catch (err: any) {
      toast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSweep = async () => {
    if (!confirm('Are you sure you want to trigger a global payment sweep?')) return;
    setLoading(true);
    try {
      const res = await fetch('/credits/admin/payments/sweep', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to execute payment sweep.');
      toast('Success', 'Payment sweep executed successfully.', 'success');
    } catch (err: any) {
      toast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Credits & Payment Management</h1>
        <p className="text-sm text-gray-500">Execute manual adjustments, top-ups, and sweeping operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual Credit Adjustments */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-600" />
            Manual Credit Adjustment
          </h2>
          <form onSubmit={handleManualAdjustment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">User ID</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Adjustment Amount (+/-)</label>
              <input
                type="number"
                step="0.01"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <input
                type="text"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Apply Adjustment
            </button>
          </form>
        </div>

        {/* Payment Top-Up & Sweeps */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-indigo-600" />
              Payment Top-Up
            </h2>
            <form onSubmit={handlePaymentTopUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment ID</label>
                <input
                  type="text"
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Top-Up Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Trigger Top-Up
              </button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-2 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-amber-600" />
              Payment Sweep
            </h2>
            <p className="text-sm text-gray-500 mb-4">Trigger an immediate manual sweep across pending payment gateways.</p>
            <button
              type="button"
              onClick={handleTriggerSweep}
              disabled={loading}
              className="w-full px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              Execute Global Sweep
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}