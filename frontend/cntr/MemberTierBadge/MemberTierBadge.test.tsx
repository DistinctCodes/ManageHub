import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemberTierBadge } from './MemberTierBadge';

describe('MemberTierBadge', () => {
  it('renders Bronze', () => { render(<MemberTierBadge tier="BRONZE" />); expect(screen.getByText('Bronze')).toBeInTheDocument(); });
  it('renders Silver', () => { render(<MemberTierBadge tier="SILVER" />); expect(screen.getByText('Silver')).toBeInTheDocument(); });
  it('renders Gold', () => { render(<MemberTierBadge tier="GOLD" />); expect(screen.getByText('Gold')).toBeInTheDocument(); });
  it('renders Platinum', () => { render(<MemberTierBadge tier="PLATINUM" />); expect(screen.getByText('Platinum')).toBeInTheDocument(); });
});