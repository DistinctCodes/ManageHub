import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WorkspaceCardSkeleton } from './WorkspaceCardSkeleton';
import { InvoiceRowSkeleton } from './InvoiceRowSkeleton';
import { MemberRowSkeleton } from './MemberRowSkeleton';
import { TableRowSkeleton } from './TableRowSkeleton';

describe('Skeleton components', () => {
  it('WorkspaceCardSkeleton renders with animate-pulse', () => {
    const { container } = render(<WorkspaceCardSkeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });
  it('InvoiceRowSkeleton renders with animate-pulse', () => {
    const { container } = render(<InvoiceRowSkeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });
  it('MemberRowSkeleton renders with animate-pulse', () => {
    const { container } = render(<MemberRowSkeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });
  it('TableRowSkeleton renders default 4 columns', () => {
    const { container } = render(<TableRowSkeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
    expect(container.querySelectorAll('.flex-1').length).toBe(4);
  });
  it('TableRowSkeleton renders custom column count', () => {
    const { container } = render(<TableRowSkeleton cols={6} />);
    expect(container.querySelectorAll('.flex-1').length).toBe(6);
  });
});