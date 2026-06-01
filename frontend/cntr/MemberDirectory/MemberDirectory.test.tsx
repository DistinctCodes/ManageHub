import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemberDirectory } from './MemberDirectory';

const makeMembers = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `member-${i}`,
    fullName: i === 0 ? 'Alice Johnson' : i === 1 ? 'Bob Smith' : `Member ${i}`,
    avatarUrl: i === 0 ? 'https://example.com/alice.jpg' : undefined,
    role: i % 2 === 0 ? 'admin' : 'member',
    joinedDate: '2024-03-15T00:00:00.000Z',
  }));

describe('MemberDirectory', () => {
  it('renders member cards with names', () => {
    render(<MemberDirectory members={makeMembers(3)} />);
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  it('shows skeleton cards when isLoading is true', () => {
    render(<MemberDirectory members={[]} isLoading />);
    // aria-busy container should be present
    expect(screen.getByRole('generic', { name: /loading members/i })).toBeInTheDocument();
    // No "no members" text visible
    expect(screen.queryByText(/no members/i)).not.toBeInTheDocument();
  });

  it('shows initials when avatarUrl is absent', () => {
    render(<MemberDirectory members={makeMembers(2)} />);
    // Bob Smith → "BS"
    expect(screen.getByLabelText('Bob Smith avatar')).toBeInTheDocument();
    expect(screen.getByLabelText('Bob Smith avatar').textContent).toBe('BS');
  });

  it('filters members by fullName (case-insensitive)', () => {
    render(<MemberDirectory members={makeMembers(3)} />);
    const input = screen.getByPlaceholderText(/search members/i);
    fireEvent.change(input, { target: { value: 'alice' } });
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
  });

  it('shows no-match message when search finds nothing', () => {
    render(<MemberDirectory members={makeMembers(2)} />);
    const input = screen.getByPlaceholderText(/search members/i);
    fireEvent.change(input, { target: { value: 'zzznotfound' } });
    expect(screen.getByText(/no members match/i)).toBeInTheDocument();
  });

  it('clears filter on empty query — shows all members', () => {
    render(<MemberDirectory members={makeMembers(2)} />);
    const input = screen.getByPlaceholderText(/search members/i);
    fireEvent.change(input, { target: { value: 'alice' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  it('shows join date for each member', () => {
    render(<MemberDirectory members={makeMembers(1)} />);
    expect(screen.getByText(/joined mar 2024/i)).toBeInTheDocument();
  });

  it('shows role badge for each member', () => {
    render(<MemberDirectory members={makeMembers(2)} />);
    expect(screen.getAllByText('admin').length).toBeGreaterThan(0);
    expect(screen.getAllByText('member').length).toBeGreaterThan(0);
  });

  it('renders empty state when members array is empty and not loading', () => {
    render(<MemberDirectory members={[]} />);
    expect(screen.getByText(/no members to display/i)).toBeInTheDocument();
  });
});
