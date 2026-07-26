'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [totalEarnings, setTotalEarnings] = useState(0);

  const handleReferUser = () => {
    if (email) {
      const newReferral = { id: Date.now(), email, status: 'sent', date: new Date() };
      setReferrals([...referrals, newReferral]);
      setTotalEarnings(totalEarnings + 50);
      setEmail('');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Member Referrals</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Referrals</p>
          <p className="text-2xl font-bold">{referrals.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Earnings</p>
          <p className="text-2xl font-bold">${totalEarnings}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <input type="email" placeholder="Referral email" value={email} onChange={(e) => setEmail(e.target.value)} className="border p-2 w-full mb-2 rounded" />
        <button onClick={handleReferUser} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full">Send Referral</button>
      </div>

      {referrals.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No referrals yet"
          description="Share your invite link with colleagues and track their activity here."
          actionLabel="Book your first workspace"
          actionHref="/workspaces"
        />
      ) : (
        <div className="space-y-2">
          {referrals.map((ref) => (
          <div key={ref.id} className="border rounded p-3 bg-gray-50 flex justify-between items-center">
            <div>
              <p className="font-semibold">{ref.email}</p>
              <p className="text-xs text-gray-500">{ref.date.toLocaleDateString()}</p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{ref.status}</span>
          </div>
          ))}
        </div>
      )}
    </div>
  );
}
