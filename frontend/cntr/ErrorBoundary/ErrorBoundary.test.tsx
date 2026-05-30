import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error('Test error');
  return <div>OK</div>;
};

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(<ErrorBoundary><Bomb shouldThrow={false} /></ErrorBoundary>);
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('renders default fallback UI on error', () => {
    render(<ErrorBoundary><Bomb shouldThrow={true} /></ErrorBoundary>);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(<ErrorBoundary fallback={<div>Custom error</div>}><Bomb shouldThrow={true} /></ErrorBoundary>);
    expect(screen.getByText('Custom error')).toBeInTheDocument();
  });

  it('resets on Try again click', () => {
    render(<ErrorBoundary><Bomb shouldThrow={true} /></ErrorBoundary>);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });
});