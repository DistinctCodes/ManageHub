import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTable } from './DataTable';

const columns = [
  { key: 'name' as const, label: 'Name', sortable: true },
  { key: 'age' as const, label: 'Age', sortable: true },
];

const data = Array.from({ length: 15 }, (_, i) => ({ name: `User ${i + 1}`, age: 20 + i }));

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
  });

  it('paginates — shows pageSize rows and Page 1 of N', () => {
    render(<DataTable columns={columns} data={data} pageSize={10} />);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.queryByText('User 11')).not.toBeInTheDocument();
  });

  it('navigates to next page', () => {
    render(<DataTable columns={columns} data={data} pageSize={10} />);
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('User 11')).toBeInTheDocument();
  });

  it('sorts ascending then descending on column click', () => {
    render(<DataTable columns={columns} data={data} pageSize={15} />);
    fireEvent.click(screen.getByText('Name'));
    expect(screen.getByLabelText('sorted ascending')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Name'));
    expect(screen.getByLabelText('sorted descending')).toBeInTheDocument();
  });

  it('calls onRowClick with the row object', () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={data} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('User 1'));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });
});