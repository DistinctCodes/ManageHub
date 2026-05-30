import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiveOccupancyWidget } from './LiveOccupancyWidget';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;
  close = vi.fn();
  constructor() { MockWebSocket.instances.push(this); }
}

beforeEach(() => {
  MockWebSocket.instances = [];
  (global as any).WebSocket = MockWebSocket;
});

afterEach(() => { vi.restoreAllMocks(); });

describe('LiveOccupancyWidget', () => {
  it('shows connecting state initially', () => {
    render(<LiveOccupancyWidget wsUrl="ws://test" capacity={10} />);
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it('shows occupancy after receiving a message', () => {
    render(<LiveOccupancyWidget wsUrl="ws://test" capacity={10} />);
    const ws = MockWebSocket.instances[0];
    ws.onopen?.();
    ws.onmessage?.({ data: JSON.stringify({ current: 7 }) });
    expect(screen.getByText('7 / 10 occupied')).toBeInTheDocument();
  });

  it('calls ws.close on unmount', () => {
    const { unmount } = render(<LiveOccupancyWidget wsUrl="ws://test" capacity={10} />);
    const ws = MockWebSocket.instances[0];
    unmount();
    expect(ws.close).toHaveBeenCalled();
  });
});