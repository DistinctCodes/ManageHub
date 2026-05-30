import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionTimeoutModal } from './SessionTimeoutModal';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('SessionTimeoutModal', () => {
  it('does not render when expiresAt is null', () => {
    render(<SessionTimeoutModal expiresAt={null} onExtend={vi.fn()} onSignOut={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not render when more than 5 minutes remain', () => {
    const expiresAt = Date.now() + 10 * 60 * 1000;
    render(<SessionTimeoutModal expiresAt={expiresAt} onExtend={vi.fn()} onSignOut={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal when ≤ 5 minutes remain', () => {
    const expiresAt = Date.now() + 3 * 60 * 1000;
    render(<SessionTimeoutModal expiresAt={expiresAt} onExtend={vi.fn()} onSignOut={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onExtend when Stay signed in clicked', () => {
    const onExtend = vi.fn();
    const expiresAt = Date.now() + 2 * 60 * 1000;
    render(<SessionTimeoutModal expiresAt={expiresAt} onExtend={onExtend} onSignOut={vi.fn()} />);
    screen.getByText('Stay signed in').click();
    expect(onExtend).toHaveBeenCalledTimes(1);
  });

  it('calls onSignOut when Sign out clicked', () => {
    const onSignOut = vi.fn();
    const expiresAt = Date.now() + 2 * 60 * 1000;
    render(<SessionTimeoutModal expiresAt={expiresAt} onExtend={vi.fn()} onSignOut={onSignOut} />);
    screen.getByText('Sign out').click();
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('countdown decrements every second', () => {
    const expiresAt = Date.now() + 2 * 60 * 1000; // 2 min
    render(<SessionTimeoutModal expiresAt={expiresAt} onExtend={vi.fn()} onSignOut={vi.fn()} />);
    const before = screen.getByText(/^\d+:\d+$/).textContent;
    act(() => { vi.advanceTimersByTime(1000); });
    const after = screen.getByText(/^\d+:\d+$/).textContent;
    expect(before).not.toBe(after);
  });
});