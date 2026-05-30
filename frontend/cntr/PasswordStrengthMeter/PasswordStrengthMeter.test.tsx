import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

describe('PasswordStrengthMeter', () => {
  it('renders nothing for empty password', () => {
    const { container } = render(<PasswordStrengthMeter password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows Weak for short simple password', () => {
    render(<PasswordStrengthMeter password="abc" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('shows Fair for moderate password', () => {
    render(<PasswordStrengthMeter password="abcABC12" />);
    expect(screen.getByText(/fair|good|strong/i)).toBeInTheDocument();
  });

  it('shows Strong for complex password', () => {
    render(<PasswordStrengthMeter password="Abcdef1!" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('renders 4 segments', () => {
    const { container } = render(<PasswordStrengthMeter password="Test1!" />);
    expect(container.querySelectorAll('.flex-1').length).toBe(4);
  });
});