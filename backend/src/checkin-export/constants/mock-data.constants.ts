import { UserBiometricData, BiometricReading } from '../interfaces/biometric-data.interface';

// Helper function to generate random data within ranges
const randomBetween = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number, decimals = 1): number =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

// Generate mock biometric readings for the last 30 days
const generateMockReadings = (userId: string, days = 30): BiometricReading[] => {
  const readings: BiometricReading[] = [];
  const baseDate = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    
    // Set random check-in time between 8 AM and 10 AM
    date.setHours(randomBetween(8, 10), randomBetween(0, 59), 0, 0);

    // Generate readings with some user-specific patterns
    const userSeed = parseInt(userId.slice(-1)) || 1;
    
    readings.push({
      timestamp: date,
      heartRate: randomBetween(60 + userSeed * 5, 100 + userSeed * 3),
      bloodPressure: {
        systolic: randomBetween(110 + userSeed * 2, 140 + userSeed),
        diastolic: randomBetween(70 + userSeed, 90 + userSeed),
      },
      temperature: randomFloat(36.1 + userSeed * 0.1, 37.2 + userSeed * 0.05, 1),
      oxygenSaturation: randomBetween(95 + userSeed, 99),
      weight: randomFloat(60 + userSeed * 10, 90 + userSeed * 8, 1),
      height: randomBetween(160 + userSeed * 5, 185 + userSeed * 2),
      steps: randomBetween(5000 + userSeed * 1000, 15000 + userSeed * 500),
      sleepHours: randomFloat(6 + userSeed * 0.5, 9 - userSeed * 0.2, 1),
      stressLevel: randomBetween(1 + userSeed % 3, 8 - userSeed % 2),
    });
  }
  
  return readings;
};

export const MOCK_BIOMETRIC_DATA: UserBiometricData[] = [
  {
    userId: 'USR001',
    userName: 'John Smith',
    email: 'john.smith@company.com',
    department: 'Engineering',
    readings: generateMockReadings('USR001'),
  },
  {
    userId: 'USR002',
    userName: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    department: 'Marketing',
    readings: generateMockReadings('USR002'),
  },
  {
    userId: 'USR003',
    userName: 'Michael Chen',
    email: 'michael.chen@company.com',
    department: 'Engineering',
    readings: generateMockReadings('USR003'),
  },
  {
    userId: 'USR004',
    userName: 'Emily Davis',
    email: 'emily.davis@company.com',
    department: 'HR',
    readings: generateMockReadings('USR004'),
  },
  {
    userId: 'USR005',
    userName: 'David Wilson',
    email: 'david.wilson@company.com',
    department: 'Sales',
    readings: generateMockReadings('USR005'),
  },
  {
    userId: 'USR006',
    userName: 'Lisa Anderson',
    email: 'lisa.anderson@company.com',
    department: 'Engineering',
    readings: generateMockReadings('USR006'),
  },
  {
    userId: 'USR007',
    userName: 'Robert Brown',
    email: 'robert.brown@company.com',
    department: 'Finance',
    readings: generateMockReadings('USR007'),
  },
  {
    userId: 'USR008',
    userName: 'Jennifer Garcia',
    email: 'jennifer.garcia@company.com',
    department: 'Marketing',
    readings: generateMockReadings('USR008'),
  },
  {
    userId: 'USR009',
    userName: 'Christopher Lee',
    email: 'christopher.lee@company.com',
    department: 'Operations',
    readings: generateMockReadings('USR009'),
  },
  {
    userId: 'USR010',
    userName: 'Amanda Taylor',
    email: 'amanda.taylor@company.com',
    department: 'HR',
    readings: generateMockReadings('USR010'),
  },
];

// Additional mock data for testing edge cases
export const MOCK_USERS_WITH_LIMITED_DATA: UserBiometricData[] = [
  {
    userId: 'USR011',
    userName: 'Test User One',
    email: 'test1@company.com',
    department: 'Testing',
    readings: generateMockReadings('USR011', 5), // Only 5 days of data
  },
  {
    userId: 'USR012',
    userName: 'Test User Two',
    email: 'test2@company.com',
    department: 'Testing',
    readings: [], // No readings
  },
];