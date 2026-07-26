import React, { useRef, useState } from 'react';

interface CheckInRecord {
  id: string;
  qrCode: string;
  timestamp: Date;
  memberName: string;
}

export const QRCheckIn: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);

  const handleQRScan = (qrCode: string) => {
    const checkIn: CheckInRecord = {
      id: Date.now().toString(),
      qrCode,
      timestamp: new Date(),
      memberName: `Member-${qrCode.substring(0, 8)}`,
    };
    setCheckIns([...checkIns, checkIn]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleQRScan(`QR-${Date.now()}`);
    }
  };

  const printQRCodes = () => {
    window.print();
  };

  return (
    <div className="qr-check-in-container">
      <h2>QR Check-In System</h2>
      <div className="scanner-section">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInput}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <button onClick={() => fileInputRef.current?.click()}>
          Scan QR Code
        </button>
        <button onClick={printQRCodes}>Print QR Codes</button>
      </div>
      <div className="check-ins-list">
        {checkIns.map(ci => (
          <div key={ci.id} className="check-in-item">
            <p>{ci.memberName}</p>
            <p>{ci.timestamp.toLocaleTimeString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
