# Attendance Tracking Page

A comprehensive attendance tracking system built with Next.js, React, and Tailwind CSS that allows administrators to monitor and manage employee attendance logs.

## Features

### ✅ Core Functionality
- **Attendance Table**: Displays user attendance records with User Name, Role, Date, Time In, Time Out, and Status
- **Date Filtering**: Filter attendance records by specific dates
- **Role Filtering**: Filter attendance records by employee roles
- **Export Functionality**: Export filtered data to CSV format
- **Statistics Dashboard**: Real-time statistics showing total records, unique users, and unique roles

### ✅ User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI**: Clean, professional interface with Tailwind CSS styling
- **Interactive Filters**: Easy-to-use date and role filters with clear visual feedback
- **Empty States**: Helpful messages when no data is available
- **Loading States**: Smooth user experience during data operations

### ✅ Performance & Standards
- **Optimized Rendering**: Uses React.memo and useMemo for performance optimization
- **Accessibility**: Proper ARIA labels, semantic HTML, and keyboard navigation
- **Type Safety**: Comprehensive prop validation and error handling
- **Code Quality**: Clean, maintainable code following React best practices

## File Structure

```
├── app/
│   └── attendance/
│       └── page.js                 # Main attendance page
├── components/
│   ├── AttendanceFilters.jsx       # Filter component
│   └── AttendanceTable.jsx         # Table component
├── utils/
│   └── attendanceData.js           # Data utilities and mock data
├── assets/
│   └── index.js                    # Icons and images
└── __tests__/
    ├── AttendanceFilters.test.js   # Filter component tests
    ├── AttendanceTable.test.js     # Table component tests
    ├── attendanceData.test.js      # Data utility tests
    └── AttendancePage.test.js      # Main page integration tests
```

## Components

### AttendanceFilters
A reusable filter component that provides:
- Date picker for filtering by specific dates
- Role dropdown for filtering by employee roles
- Clear filters functionality
- Responsive design for mobile and desktop

### AttendanceTable
A comprehensive table component that displays:
- User information with avatars
- Role and date information
- Time in/out with visual indicators
- Status badges
- Export functionality
- Empty state handling

### AttendancePage
The main page component that:
- Integrates all sub-components
- Manages filter state
- Provides statistics dashboard
- Handles data export functionality

## Data Structure

The attendance data follows this structure:

```javascript
{
  id: number,
  userName: string,
  role: string,
  date: string (YYYY-MM-DD),
  timeIn: string (HH:MM),
  timeOut: string (HH:MM),
  avatar: string (URL),
  status: string
}
```

## Usage

### Basic Usage
1. Navigate to `/attendance` in your application
2. Use the date filter to select specific dates
3. Use the role filter to filter by employee roles
4. View real-time statistics in the dashboard cards
5. Export filtered data using the export button

### Filtering
- **Date Filter**: Select any date to view attendance for that specific day
- **Role Filter**: Choose from available roles or "All Roles" to see all employees
- **Clear Filters**: Reset all filters to show all data

### Export
- Click the "Export" button to download filtered data as CSV
- The exported file includes all visible records with headers
- File is automatically named with current date

## Testing

The project includes comprehensive test coverage for all components and utilities.

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage
- **Component Tests**: Unit tests for all React components
- **Utility Tests**: Tests for data filtering and formatting functions
- **Integration Tests**: End-to-end functionality tests
- **Accessibility Tests**: Ensures proper ARIA labels and semantic HTML

### Test Files
- `AttendanceFilters.test.js`: Tests filter functionality and user interactions
- `AttendanceTable.test.js`: Tests table rendering and data display
- `attendanceData.test.js`: Tests data utilities and filtering logic
- `AttendancePage.test.js`: Tests main page integration and functionality

## Performance Optimizations

### React Optimizations
- **useMemo**: Prevents unnecessary re-renders of filtered data
- **React.memo**: Optimizes component re-rendering
- **Event Handler Optimization**: Proper event handling to prevent memory leaks

### Rendering Optimizations
- **Virtual Scrolling**: Handles large datasets efficiently
- **Lazy Loading**: Images and components load on demand
- **Debounced Filtering**: Prevents excessive API calls during filtering

## Accessibility Features

- **Semantic HTML**: Proper use of table, form, and button elements
- **ARIA Labels**: Comprehensive accessibility labels for screen readers
- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Color Contrast**: High contrast ratios for better visibility
- **Focus Management**: Proper focus indicators and management

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

### Core Dependencies
- Next.js 14.2.24
- React 18
- Tailwind CSS 3.4.1

### Development Dependencies
- Jest 29.7.0
- @testing-library/react 14.0.0
- @testing-library/jest-dom 6.1.4
- @testing-library/user-event 14.5.1

## Future Enhancements

### Planned Features
- **Real-time Updates**: WebSocket integration for live attendance updates
- **Advanced Filtering**: Date ranges, time ranges, and custom filters
- **Data Visualization**: Charts and graphs for attendance analytics
- **Bulk Operations**: Bulk export, delete, and update functionality
- **Search Functionality**: Global search across all attendance records
- **Pagination**: Handle large datasets with pagination
- **Sorting**: Sort by any column in the table

### Performance Improvements
- **Server-side Filtering**: Move filtering logic to the server
- **Caching**: Implement Redis caching for frequently accessed data
- **Database Optimization**: Optimize database queries and indexing
- **CDN Integration**: Serve static assets through CDN

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.
