import React from 'react';
import CopyButton from '../CopyButton/CopyButton';

interface ReferralWidgetProps {
  referralCode: string;
  referralLink: string;
}

export default function ReferralWidget({
  referralCode,
  referralLink,
}: ReferralWidgetProps) {
  const whatsappText = `Join using my referral link: ${referralLink}`;

  const whatsappUrl =
    `https://wa.me/?text=${encodeURIComponent(
      whatsappText,
    )}`;

  const emailSubject = 'Join Me';
  const emailBody = `Use my referral link: ${referralLink}`;

  const emailUrl =
    `mailto:?subject=${encodeURIComponent(
      emailSubject,
    )}&body=${encodeURIComponent(
      emailBody,
    )}`;

  return (
    <div>
      <h3>Referral Code</h3>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <div
          role="textbox"
          aria-label="Referral Code"
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            minWidth: '220px',
          }}
        >
          {referralCode}
        </div>

        <CopyButton
          text={referralCode}
          label="Copy"
        />
      </div>

      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share via WhatsApp
        </a>

        <a href={emailUrl}>
          Share via Email
        </a>
      </div>
    </div>
  );
}