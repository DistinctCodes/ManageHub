// src/components/WalletStatusCard.tsx
'use client';

import React, { useState } from 'react';
import { Wallet, ShieldCheck, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from './ToastProvider';

interface WalletStatusCardProps {
  userId: string;
  isLinked: boolean;
  walletAddress?: string;
  onLinkSuccess: () => void;
}

export const WalletStatusCard: React.FC<WalletStatusCardProps> = ({
  userId,
  isLinked,
  walletAddress,
  onLinkSuccess,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [showManualFallback, setShowManualFallback] = useState<boolean>(false);
  const [manualSignature, setManualSignature] = useState<string>('');
  const { toast } = useToast();

  const handleFreighterLink = async () => {
    setLoading(true);
    try {
      // Check if Freighter extension is installed
      const freighter = (window as any).freighter;
      if (!freighter || typeof freighter.isConnected !== 'function') {
        throw new Error('Freighter wallet extension not detected. Please install Freighter or use manual linking.');
      }

      const isConnected = await freighter.isConnected();
      if (!isConnected) {
        throw new Error('Freighter wallet is not connected or permission was denied.');
      }

      const publicKey = await freighter.getPublicKey();
      if (!publicKey) {
        throw new Error('Failed to retrieve public key from Freighter wallet.');
      }

      // Fetch challenge nonce from backend
      const challengeRes = await fetch(`/wallets/${userId}/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey }),
      });

      if (!challengeRes.ok) {
        throw new Error('Failed to fetch authentication challenge nonce.');
      }

      const { nonce } = await challengeRes.json();

      // Sign challenge using Freighter
      const signature = await freighter.signMessage(nonce);

      // Submit verification and link wallet
      const linkRes = await fetch(`/wallets/${userId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey, signature }),
      });

      if (!linkRes.ok) {
        throw new Error('Failed to verify wallet signature and link account.');
      }

      toast('Wallet Linked', 'Successfully linked your Stellar wallet via Freighter.', 'success');
      onLinkSuccess();
    } catch (err: any) {
      toast('Linking Failed', err.message || 'An unexpected error occurred during wallet linking.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSignature.trim()) {
      toast('Invalid Input', 'Please enter a valid signature string.', 'error');
      return;
    }

    setLoading(true);
    try {
      const linkRes = await fetch(`/wallets/${userId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: manualSignature.trim() }),
      });

      if (!linkRes.ok) {
        throw new Error('Manual signature verification failed.');
      }

      toast('Wallet Linked', 'Successfully linked wallet via manual signature.', 'success');
      onLinkSuccess();
    } catch (err: any) {
      toast('Linking Failed', err.message || 'An error occurred during manual linking.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-indigo-600" />
          Stellar Wallet Status
        </h3>
        {isLinked ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
            <ShieldCheck className="h-4 w-4" />
            Linked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
            <AlertCircle className="h-4 w-4" />
            Unlinked
          </span>
        )}
      </div>

      {isLinked ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Your account is successfully paired with address:</p>
          <code className="block bg-gray-50 p-2 rounded text-xs font-mono text-gray-800 break-all border border-gray-200">
            {walletAddress || 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'}
          </code>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Link your Stellar wallet extension to verify your identity and manage payouts automatically.
          </p>

          {!showManualFallback ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleFreighterLink}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Connect with Freighter
              </button>
              <div className="flex items-center justify-between pt-2">
                <a
                  href="https://www.freighter.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"
                >
                  Install Freighter Extension <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowManualFallback(true)}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Use manual signature fallback
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualLink} className="space-y-3 pt-2 border-t border-gray-100">
              <div>
                <label htmlFor="manual-signature" className="block text-xs font-medium text-gray-700 mb-1">
                  Paste Raw Signature Nonce
                </label>
                <textarea
                  id="manual-signature"
                  rows={2}
                  value={manualSignature}
                  onChange={(e) => setManualSignature(e.target.value)}
                  placeholder="Enter base64 or hex signature..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowManualFallback(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Back to Freighter
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-transparent rounded-md text-xs font-medium text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                  Submit Signature
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};