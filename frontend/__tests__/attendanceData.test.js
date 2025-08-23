import { 
  attendanceData, 
  availableRoles, 
  formatDate, 
  filterAttendanceData 
} from '../utils/attendanceData';

describe('attendanceData', () => {
  test('contains the expected number of records', () => {
    expect(attendanceData).toHaveLength(15);
  });

  test('each record has required properties', () => {
    attendanceData.forEach(record => {
      expect(record).toHaveProperty('id');
      expect(record).toHaveProperty('userName');
      expect(record).toHaveProperty('role');
      expect(record).toHaveProperty('date');
      expect(record).toHaveProperty('timeIn');
      expect(record).toHaveProperty('timeOut');
      expect(record).toHaveProperty('avatar');
      expect(record).toHaveProperty('status');
    });
  });

  test('all records have valid data types', () => {
    attendanceData.forEach(record => {
      expect(typeof record.id).toBe('number');
      expect(typeof record.userName).toBe('string');
      expect(typeof record.role).toBe('string');
      expect(typeof record.date).toBe('string');
      expect(typeof record.timeIn).toBe('string');
      expect(typeof record.timeOut).toBe('string');
      expect(typeof record.avatar).toBe('string');
      expect(typeof record.status).toBe('string');
    });
  });

  test('all records have present status', () => {
    attendanceData.forEach(record => {
      expect(record.status).toBe('present');
    });
  });
});

describe('availableRoles', () => {
  test('contains expected roles', () => {
    const expectedRoles = [
      "All Roles",
      "Software Engineer",
      "Product Manager",
      "Designer",
      "Marketing Specialist",
      "Data Analyst",
      "HR Manager"
    ];
    
    expect(availableRoles).toEqual(expectedRoles);
  });

  test('starts with "All Roles"', () => {
    expect(availableRoles[0]).toBe('All Roles');
  });
});

describe('formatDate', () => {
  test('formats date correctly', () => {
    const result = formatDate('2024-01-15');
    expect(result).toMatch(/January.*2024/);
  });

  test('handles different date formats', () => {
    const result = formatDate('2024-12-25');
    expect(result).toMatch(/December.*2024/);
  });

  test('returns string', () => {
    const result = formatDate('2024-01-15');
    expect(typeof result).toBe('string');
  });
});

describe('filterAttendanceData', () => {
  test('returns all data when no filters applied', () => {
    const result = filterAttendanceData(attendanceData, '', 'All Roles');
    expect(result).toHaveLength(15);
  });

  test('filters by date correctly', () => {
    const result = filterAttendanceData(attendanceData, '2024-01-15', 'All Roles');
    expect(result).toHaveLength(6);
    result.forEach(record => {
      expect(record.date).toBe('2024-01-15');
    });
  });

  test('filters by role correctly', () => {
    const result = filterAttendanceData(attendanceData, '', 'Software Engineer');
    expect(result.length).toBeGreaterThan(0);
    result.forEach(record => {
      expect(record.role).toBe('Software Engineer');
    });
  });

  test('filters by both date and role', () => {
    const result = filterAttendanceData(attendanceData, '2024-01-15', 'Software Engineer');
    expect(result.length).toBeGreaterThan(0);
    result.forEach(record => {
      expect(record.date).toBe('2024-01-15');
      expect(record.role).toBe('Software Engineer');
    });
  });

  test('returns empty array when no matches found', () => {
    const result = filterAttendanceData(attendanceData, '2024-01-15', 'Non-existent Role');
    expect(result).toHaveLength(0);
  });

  test('handles empty data array', () => {
    const result = filterAttendanceData([], '2024-01-15', 'Software Engineer');
    expect(result).toHaveLength(0);
  });

  test('handles null filters', () => {
    const result = filterAttendanceData(attendanceData, null, null);
    expect(result).toHaveLength(15);
  });

  test('handles undefined filters', () => {
    const result = filterAttendanceData(attendanceData, undefined, undefined);
    expect(result).toHaveLength(15);
  });

  test('does not mutate original data', () => {
    const originalData = [...attendanceData];
    filterAttendanceData(attendanceData, '2024-01-15', 'Software Engineer');
    expect(attendanceData).toEqual(originalData);
  });
});
