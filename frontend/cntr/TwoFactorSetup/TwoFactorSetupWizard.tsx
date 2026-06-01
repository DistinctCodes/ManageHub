import React, { useState } from 'react';

interface Props { qrCodeUrl: string; manualKey: string; onVerify: (code: string) => Promise<boolean>; onComplete: () => void; }

export function TwoFactorSetupWizard({ qrCodeUrl, manualKey, onVerify, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async () => {
    const ok = await onVerify(otp);
    if (ok) { onComplete(); } else { setError('Invalid code. Please try again.'); }
  };

  if (step === 1) return (
    <div className="space-y-4 text-center">
      <p>Set up two-factor authentication to secure your account.</p>
      <button className="btn-primary" onClick={() => setStep(2)}>Begin Setup</button>
    </div>
  );

  if (step === 2) return (
    <div className="space-y-4 text-center">
      <img src={qrCodeUrl} alt="Scan with your authenticator app" className="mx-auto" />
      <p className="text-sm">Manual key: <code>{manualKey}</code></p>
      <div className="flex gap-2 justify-center">
        <button onClick={() => setStep(1)}>Back</button>
        <button className="btn-primary" onClick={() => setStep(3)}>Next</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 text-center">
      <p>Enter the 6-digit code from your authenticator app.</p>
      <input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="border rounded px-3 py-2 text-center tracking-widest w-32" placeholder="000000" />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-2 justify-center">
        <button onClick={() => setStep(2)}>Back</button>
        <button className="btn-primary" disabled={otp.length !== 6} onClick={handleVerify}>Verify</button>
      </div>
    </div>
  );
}