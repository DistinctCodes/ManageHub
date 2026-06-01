import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminMemberTable } from './AdminMemberTable';

const members = [{ id: '1', name: 'Alice', email: 'a@test.com', role: 'USER' as const, status: 'ACTIVE' as const, joinedAt: '2024-01-01' }];
const props = { members, onRoleChange: vi.fn(), onBan: vi.fn(), onUnban: vi.fn() };

describe('AdminMemberTable', () => {
  it('renders member name', () => { render(<AdminMemberTable {...props} />); expect(screen.getByText('Alice')).toBeInTheDocument(); });
  it('requires confirmation before ban', () => { render(<AdminMemberTable {...props} />); fireEvent.click(screen.getByText('Ban')); expect(screen.getByText('Confirm Ban')).toBeInTheDocument(); expect(props.onBan).not.toHaveBeenCalled(); });
  it('calls onBan after confirmation', () => { render(<AdminMemberTable {...props} />); fireEvent.click(screen.getByText('Ban')); fireEvent.click(screen.getByText('Confirm Ban')); expect(props.onBan).toHaveBeenCalledWith('1'); });
});