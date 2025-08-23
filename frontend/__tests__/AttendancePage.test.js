import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the components
jest.mock('../components/AttendanceFilters', () => {
  return function MockAttendanceFilters({ dateFilter, setDateFilter, roleFilter, setRoleFilter, availableRoles }) {
    return (
      <div data-testid="attendance-filters">
        <input
          data-testid="date-filter"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        <select
          data-testid="role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          {availableRoles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>
    );
  };
});

jest.mock('../components/AttendanceTable', () => {
  return function MockAttendanceTable({ data, onExport }) {
    return (
      <div data-testid="attendance-table">
        <button data-testid="export-button" onClick={onExport}>
          Export
        </button>
        <div data-testid="record-count">{data?.length || 0} records</div>
      </div>
    );
  };
});

// Mock the utils
jest.mock('../utils/attendanceData', () => ({
  attendanceData: [
    {
      id: 1,
      userName: "John Doe",
      role: "Software Engineer",
      date: "2024-01-15",
      timeIn: "09:15",
      timeOut: "17:30",
      avatar: "https://example.com/avatar1.jpg",
      status: "present"
    },
    {
      id: 2,
      userName: "Jane Smith",
      role: "Product Manager",
      date: "2024-01-15",
      timeIn: "08:45",
      timeOut: "18:00",
      avatar: "https://example.com/avatar2.jpg",
      status: "present"
    }
  ],
  availableRoles: ["All Roles", "Software Engineer", "Product Manager"],
  filterAttendanceData: jest.fn((data, dateFilter, roleFilter) => {
    let filtered = [...data];
    if (dateFilter) {
      filtered = filtered.filter(item => item.date === dateFilter);
    }
    if (roleFilter && roleFilter !== "All Roles") {
      filtered = filtered.filter(item => item.role === roleFilter);
    }
    return filtered;
  })
}));

// Mock window.URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement and related methods
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement.mockReturnValue({
    href: '',
    download: '',
    click: mockClick
  })
});

Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild
});

Object.defineProperty(document.body, 'removeChild', {
  value: mockRemoveChild
});

// Import the component after mocks
import AttendancePage from '../app/attendance/page';

describe('AttendancePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders page title and description', () => {
    render(<AttendancePage />);
    
    expect(screen.getByText('Attendance Tracking')).toBeInTheDocument();
    expect(screen.getByText(/Monitor and track employee attendance logs/)).toBeInTheDocument();
  });

  test('renders attendance filters component', () => {
    render(<AttendancePage />);
    
    expect(screen.getByTestId('attendance-filters')).toBeInTheDocument();
  });

  test('renders attendance table component', () => {
    render(<AttendancePage />);
    
    expect(screen.getByTestId('attendance-table')).toBeInTheDocument();
  });

  test('renders statistics cards', () => {
    render(<AttendancePage />);
    
    expect(screen.getByText('Total Records')).toBeInTheDocument();
    expect(screen.getByText('Unique Users')).toBeInTheDocument();
    expect(screen.getByText('Unique Roles')).toBeInTheDocument();
  });

  test('displays correct record count in table', () => {
    render(<AttendancePage />);
    
    expect(screen.getByText('2 records')).toBeInTheDocument();
  });

  test('handles date filter changes', () => {
    render(<AttendancePage />);
    
    const dateFilter = screen.getByTestId('date-filter');
    fireEvent.change(dateFilter, { target: { value: '2024-01-15' } });
    
    expect(dateFilter).toHaveValue('2024-01-15');
  });

  test('handles role filter changes', () => {
    render(<AttendancePage />);
    
    const roleFilter = screen.getByTestId('role-filter');
    fireEvent.change(roleFilter, { target: { value: 'Software Engineer' } });
    
    expect(roleFilter).toHaveValue('Software Engineer');
  });

  test('handles export functionality', async () => {
    render(<AttendancePage />);
    
    const exportButton = screen.getByTestId('export-button');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });
  });

  test('displays statistics correctly', () => {
    render(<AttendancePage />);
    
    // Check that statistics are displayed (they should show the filtered data counts)
    expect(screen.getByText('2')).toBeInTheDocument(); // Total records
  });

  test('has proper page structure', () => {
    render(<AttendancePage />);
    
    // Check for main container
    const mainContainer = screen.getByText('Attendance Tracking').closest('div');
    expect(mainContainer).toHaveClass('min-h-screen', 'bg-gray-50');
  });

  test('has responsive design classes', () => {
    render(<AttendancePage />);
    
    const container = screen.getByText('Attendance Tracking').closest('div');
    expect(container).toHaveClass('max-w-7xl', 'mx-auto', 'px-4');
  });
});
