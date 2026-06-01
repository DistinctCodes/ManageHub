import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QRCheckInDisplay } from './QRCheckInDisplay';

vi.mock('../CountdownTimer/CountdownTimer', () => ({ CountdownTimer: ({ onExpire }: any) => <button onClick={onExpire}>expire</button> }));

describe('QRCheckInDisplay', () => {
  it('renders workspace name', () => { render(<QRCheckInDisplay qrDataUrl="data:img" workspaceName="Hub A" expiresAt="2099-01-01" />); expect(screen.getByText('Hub A')).toBeInTheDocument(); });
  it('renders QR code image', () => { render(<QRCheckInDisplay qrDataUrl="data:img" workspaceName="Hub A" expiresAt="2099-01-01" />); expect(screen.getByAltText('Check-in QR Code')).toBeInTheDocument(); });
  it('shows expired message after timer fires', () => {
    render(<QRCheckInDisplay qrDataUrl="data:img" workspaceName="Hub A" expiresAt="2099-01-01" />);
    screen.getByText('expire').click();
    expect(screen.getByText(/QR code expired/)).toBeInTheDocument();
  });
});