import React, { useState } from 'react';
import { CountdownTimer } from '../CountdownTimer/CountdownTimer';

interface Props { qrDataUrl: string; workspaceName: string; expiresAt: string; }

export function QRCheckInDisplay({ qrDataUrl, workspaceName, expiresAt }: Props) {
  const [expired, setExpired] = useState(false);
  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      <h2 className="text-lg font-semibold">{workspaceName}</h2>
      {expired ? (
        <p className="text-red-500 text-sm">QR code expired — request a new one.</p>
      ) : (
        <img src={qrDataUrl} alt="Check-in QR Code" className="w-48 h-48" />
      )}
      <CountdownTimer targetDate={expiresAt} onExpire={() => setExpired(true)} />
    </div>
  );
}