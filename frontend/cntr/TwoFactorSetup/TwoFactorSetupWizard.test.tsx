import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TwoFactorSetupWizard } from './TwoFactorSetupWizard';

const props = { qrCodeUrl: 'http://qr.test', manualKey: 'ABCD1234', onVerify: vi.fn().mockResolvedValue(true), onComplete: vi.fn() };

describe('TwoFactorSetupWizard', () => {
  it('renders step 1 with Begin Setup button', () => { render(<TwoFactorSetupWizard {...props} />); expect(screen.getByText('Begin Setup')).toBeInTheDocument(); });
  it('advances to step 2 on Begin Setup', () => { render(<TwoFactorSetupWizard {...props} />); fireEvent.click(screen.getByText('Begin Setup')); expect(screen.getByAltText('Scan with your authenticator app')).toBeInTheDocument(); });
  it('shows manual key on step 2', () => { render(<TwoFactorSetupWizard {...props} />); fireEvent.click(screen.getByText('Begin Setup')); expect(screen.getByText('ABCD1234')).toBeInTheDocument(); });
});