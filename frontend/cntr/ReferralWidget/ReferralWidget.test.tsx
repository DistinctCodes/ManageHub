import { render, screen } from '@testing-library/react';
import ReferralWidget from './ReferralWidget';

describe('ReferralWidget', () => {
  const referralCode = 'ABC123';
  const referralLink =
    'https://example.com/ref/ABC123';

  it('renders referral code', () => {
    render(
      <ReferralWidget
        referralCode={referralCode}
        referralLink={referralLink}
      />,
    );

    expect(
      screen.getByText(referralCode),
    ).toBeInTheDocument();
  });

  it('renders CopyButton', () => {
    render(
      <ReferralWidget
        referralCode={referralCode}
        referralLink={referralLink}
      />,
    );

    expect(
      screen.getByRole('button', {
        name: /copy/i,
      }),
    ).toBeInTheDocument();
  });

  it('creates whatsapp share link', () => {
    render(
      <ReferralWidget
        referralCode={referralCode}
        referralLink={referralLink}
      />,
    );

    const whatsappLink =
      screen.getByRole('link', {
        name: /share via whatsapp/i,
      });

    expect(
      whatsappLink.getAttribute('href'),
    ).toBe(
      `https://wa.me/?text=${encodeURIComponent(
        `Join using my referral link: ${referralLink}`,
      )}`,
    );
  });

  it('creates email share link', () => {
    render(
      <ReferralWidget
        referralCode={referralCode}
        referralLink={referralLink}
      />,
    );

    const emailLink =
      screen.getByRole('link', {
        name: /share via email/i,
      });

    expect(
      emailLink.getAttribute('href'),
    ).toBe(
      `mailto:?subject=${encodeURIComponent(
        'Join Me',
      )}&body=${encodeURIComponent(
        `Use my referral link: ${referralLink}`,
      )}`,
    );
  });
});