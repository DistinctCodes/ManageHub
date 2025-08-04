export interface BiometricReading {
    timestamp: Date;
    heartRate: number;
    bloodPressure: {
      systolic: number;
      diastolic: number;
    };
    temperature: number; // in Celsius
    oxygenSaturation: number; // percentage
    weight: number; // in kg
    height: number; // in cm
    steps: number;
    sleepHours: number;
    stressLevel: number; // 1-10 scale
  }
  
  export interface UserBiometricData {
    userId: string;
    userName: string;
    email: string;
    department: string;
    readings: BiometricReading[];
  }
  
  export interface BiometricDataStore {
    getAllUsers(): UserBiometricData[];
    getUserById(userId: string): UserBiometricData | null;
    getUsersByDateRange(startDate: Date, endDate: Date): UserBiometricData[];
    getReadingsByDateRange(
      userId: string,
      startDate: Date,
      endDate: Date,
    ): BiometricReading[];
  }