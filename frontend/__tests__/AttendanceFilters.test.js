import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AttendanceFilters from '../components/AttendanceFilters';

// Mock the assets import
jest.mock('../assets', () => ({
  calendarIcon: 'data:image/svg+xml;base64,mock-calendar-icon',
  filterIcon: 'data:image/svg+xml;base64,mock-filter-icon',
}));

describe('AttendanceFilters', () => {
  const mockProps = {
    dateFilter: '',
    setDateFilter: jest.fn(),
    roleFilter: 'All Roles',
    setRoleFilter: jest.fn(),
    availableRoles: ['All Roles', 'Software Engineer', 'Product Manager', 'Designer']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders filter section with title', () => {
    render(<AttendanceFilters {...mockProps} />);
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  test('renders date filter input', () => {
    render(<AttendanceFilters {...mockProps} />);
    
    const dateInput = screen.getByLabelText('Date');
    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toHaveAttribute('type', 'date');
  });

  test('renders role filter select', () => {
    render(<AttendanceFilters {...mockProps} />);
    
    const roleSelect = screen.getByRole('combobox');
    expect(roleSelect).toBeInTheDocument();
  });

  test('renders all available roles in select', () => {
    render(<AttendanceFilters {...mockProps} />);
    
    mockProps.availableRoles.forEach(role => {
      expect(screen.getByText(role)).toBeInTheDocument();
    });
  });

  test('calls setDateFilter when date input changes', () => {
    render(<AttendanceFilters {...mockProps} />);
    
    const dateInput = screen.getByLabelText('Date');
    fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
    
    expect(mockProps.setDateFilter).toHaveBeenCalledWith('2024-01-15');
  });

  test('calls setRoleFilter when role select changes', () => {
    render(<AttendanceFilters {...mockProps} />);
    
    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: 'Software Engineer' } });
    
    expect(mockProps.setRoleFilter).toHaveBeenCalledWith('Software Engineer');
  });

  test('renders clear filters button', () => {
    render(<AttendanceFilters {...mockProps} />);
    
    const clearButton = screen.getByText('Clear Filters');
    expect(clearButton).toBeInTheDocument();
  });

  test('calls both setDateFilter and setRoleFilter when clear filters is clicked', () => {
    render(<AttendanceFilters {...mockProps} />);
    
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);
    
    expect(mockProps.setDateFilter).toHaveBeenCalledWith('');
    expect(mockProps.setRoleFilter).toHaveBeenCalledWith('All Roles');
  });

  test('displays current filter values', () => {
    const propsWithValues = {
      ...mockProps,
      dateFilter: '2024-01-15',
      roleFilter: 'Software Engineer'
    };
    
    render(<AttendanceFilters {...propsWithValues} />);
    
    const dateInput = screen.getByLabelText('Date');
    const roleSelect = screen.getByRole('combobox');
    
    expect(dateInput).toHaveValue('2024-01-15');
    expect(roleSelect).toHaveValue('Software Engineer');
  });

  test('has proper accessibility attributes', () => {
    render(<AttendanceFilters {...mockProps} />);
    
    const dateInput = screen.getByLabelText('Date');
    const roleSelect = screen.getByRole('combobox');
    
    expect(dateInput).toHaveAttribute('type', 'date');
    expect(roleSelect).toBeInTheDocument();
  });
});
