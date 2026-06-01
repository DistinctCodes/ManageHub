import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuditLogTable } from './AuditLogTable';

const BASE_TS = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // 3 hours ago

const makeLogs = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    actorId: `user-${i}`,
    actorRole: i % 2 === 0 ? 'admin' : 'member',
    action: i % 2 === 0 ? 'DELETE_RECORD' : 'UPDATE_SETTINGS',
    resourceType: 'Workspace',
    resourceId: `abcdef12-${i.toString().padStart(8, '0')}`,
    timestamp: BASE_TS,
  }));

describe('AuditLogTable', () => {
  it('renders table column headers', () => {
    render(<AuditLogTable logs={makeLogs(1)} />);
    expect(screen.getByText(/timestamp/i)).toBeInTheDocument();
    expect(screen.getByText(/actor/i)).toBeInTheDocument();
    expect(screen.getByText(/action/i)).toBeInTheDocument();
    expect(screen.getByText(/resource/i)).toBeInTheDocument();
  });

  it('shows empty state message when logs array is empty', () => {
    render(<AuditLogTable logs={[]} />);
    expect(screen.getByText(/no audit logs found/i)).toBeInTheDocument();
  });

  it('renders relative timestamp text', () => {
    render(<AuditLogTable logs={makeLogs(1)} />);
    // "3 hours ago" or similar — just assert something other than ISO string is visible
    const cell = screen.getByTitle(BASE_TS);
    expect(cell.textContent).toBeTruthy();
    expect(cell.textContent).not.toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('puts the full ISO timestamp in the title attribute', () => {
    render(<AuditLogTable logs={makeLogs(1)} />);
    expect(screen.getByTitle(BASE_TS)).toBeInTheDocument();
  });

  it('renders resource as {resourceType} #resourceId[0..8]', () => {
    const logs = makeLogs(1);
    render(<AuditLogTable logs={logs} />);
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText(`#${logs[0].resourceId.slice(0, 8)}`)).toBeInTheDocument();
  });

  it('does NOT render Load More button when onLoadMore is not provided', () => {
    render(<AuditLogTable logs={makeLogs(3)} />);
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('renders Load More button when onLoadMore is provided', () => {
    const onLoadMore = vi.fn();
    render(<AuditLogTable logs={makeLogs(3)} onLoadMore={onLoadMore} />);
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
  });

  it('calls onLoadMore when Load More button is clicked', () => {
    const onLoadMore = vi.fn();
    render(<AuditLogTable logs={makeLogs(3)} onLoadMore={onLoadMore} />);
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('renders all log rows', () => {
    render(<AuditLogTable logs={makeLogs(5)} />);
    // Each row shows the actorId
    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`user-${i}`)).toBeInTheDocument();
    }
  });
});
