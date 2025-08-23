import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AttendanceTable from '../components/AttendanceTable';

// Mock the assets import
jest.mock('../assets', () => ({
  clockInIcon: 'data:image/svg+xml;base64,mock-clock-in-icon',
  clockOutIcon: 'data:image/svg+xml;base64,mock-clock-out-icon',
  downloadIcon: 'data:image/svg+xml;base64,mock-download-icon',
}));

// Mock the utils import
jest.mock('../utils/attendanceData', () => ({
  formatDate: jest.fn((date) => `Formatted ${date}`),
}));

describe('AttendanceTable', () => {
  const mockData = [
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
  ];

  const mockOnExport = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders table with correct headers', () => {
    render(<AttendanceTable data={mockData} onExport={mockOnExport} />);
    
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Time In')).toBeInTheDocument();
    expect(screen.getByText('Time Out')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  test('renders attendance records count in header', () => {
    render(<AttendanceTable data={mockData} onExport={mockOnExport} />);
    
    expect(screen.getByText('Attendance Records (2)')).toBeInTheDocument();
  });

  test('renders export button', () => {
    render(<AttendanceTable data={mockData} onExport={mockOnExport} />);
    
    const exportButton = screen.getByText('Export');
    expect(exportButton).toBeInTheDocument();
  });

  test('calls onExport when export button is clicked', () => {
    render(<AttendanceTable data={mockData} onExport={mockOnExport} />);
    
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    expect(mockOnExport).toHaveBeenCalledTimes(1);
  });

  test('renders user data correctly', () => {
    render(<AttendanceTable data={mockData} onExport={mockOnExport} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Product Manager')).toBeInTheDocument();
  });

  test('renders time data correctly', () => {
    render(<AttendanceTable data={mockData} onExport={mockOnExport} />);
    
    expect(screen.getByText('09:15')).toBeInTheDocument();
    expect(screen.getByText('17:30')).toBeInTheDocument();
    expect(screen.getByText('08:45')).toBeInTheDocument();
    expect(screen.getByText('18:00')).toBeInTheDocument();
  });

  test('renders status badges correctly', () => {
    render(<AttendanceTable data={mockData} onExport={mockOnExport} />);
    
    const statusBadges = screen.getAllByText('present');
    expect(statusBadges).toHaveLength(2);
  });

  test('renders user avatars', () => {
    render(<AttendanceTable data={mockData} onExport={mockOnExport} />);
    
    const avatars = screen.getAllByAltText(/John Doe|Jane Smith/);
    expect(avatars).toHaveLength(2);
    expect(avatars[0]).toHaveAttribute('src', 'https://example.com/avatar1.jpg');
    expect(avatars[1]).toHaveAttribute('src', 'https://example.com/avatar2.jpg');
  });

  test('renders empty state when no data', () => {
    render(<AttendanceTable data={[]} onExport={mockOnExport} />);
    
    expect(screen.getByText('No attendance records found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filters or check back later.')).toBeInTheDocument();
  });

  test('renders empty state when data is null', () => {
    render(<AttendanceTable data={null} onExport={mockOnExport} />);
    
    expect(screen.getByText('No attendance records found')).toBeInTheDocument();
  });

  test('renders empty state when data is undefined', () => {
    render(<AttendanceTable data={undefined} onExport={mockOnExport} />);
    
    expect(screen.getByText('No attendance records found')).toBeInTheDocument();
  });

  test('has proper table structure', () => {
    render(<AttendanceTable data={mockData} onExport={mockOnExport} />);
    
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    
    const rows = screen.getAllByRole('row');
    // Header row + 2 data rows
    expect(rows).toHaveLength(3);
  });

  test('has proper accessibility attributes', () => {
    render(<AttendanceTable data={mockData} onExport={mockOnExport} />);
    
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    
    const exportButton = screen.getByText('Export');
    expect(exportButton).toHaveAttribute('type', 'button');
  });
});
