import { Injectable, Logger } from '@nestjs/common';
import { 
  BiometricDataStore, 
  UserBiometricData, 
  BiometricReading 
} from '../interfaces/biometric-data.interface';
import { 
  MOCK_BIOMETRIC_DATA, 
  MOCK_USERS_WITH_LIMITED_DATA 
} from '../constants/mock-data.constants';

@Injectable()
export class BiometricDataService implements BiometricDataStore {
  private readonly logger = new Logger(BiometricDataService.name);
  private readonly dataStore: UserBiometricData[];

  constructor() {
    // Combine all mock data
    this.dataStore = [...MOCK_BIOMETRIC_DATA, ...MOCK_USERS_WITH_LIMITED_DATA];
    this.logger.log(`Initialized biometric data store with ${this.dataStore.length} users`);
  }

  getAllUsers(): UserBiometricData[] {
    this.logger.debug('Fetching all users from biometric data store');
    return this.dataStore;
  }

  getUserById(userId: string): UserBiometricData | null {
    this.logger.debug(`Fetching user by ID: ${userId}`);
    const user = this.dataStore.find(user => user.userId === userId);
    
    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      return null;
    }
    
    return user;
  }

  getUsersByDateRange(startDate: Date, endDate: Date): UserBiometricData[] {
    this.logger.debug(`Fetching users with data between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    
    return this.dataStore
      .map(user => ({
        ...user,
        readings: this.filterReadingsByDateRange(user.readings, startDate, endDate),
      }))
      .filter(user => user.readings.length > 0);
  }

  getReadingsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): BiometricReading[] {
    this.logger.debug(`Fetching readings for user ${userId} between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    
    const user = this.getUserById(userId);
    if (!user) {
      return [];
    }

    return this.filterReadingsByDateRange(user.readings, startDate, endDate);
  }

  private filterReadingsByDateRange(
    readings: BiometricReading[],
    startDate: Date,
    endDate: Date,
  ): BiometricReading[] {
    return readings.filter(reading => {
      const readingDate = new Date(reading.timestamp);
      return readingDate >= startDate && readingDate <= endDate;
    });
  }

  // Additional utility methods
  getDepartments(): string[] {
    const departments = new Set(this.dataStore.map(user => user.department));
    return Array.from(departments).sort();
  }

  getUsersByDepartment(department: string): UserBiometricData[] {
    return this.dataStore.filter(user => user.department === department);
  }

  getLatestReadingForUser(userId: string): BiometricReading | null {
    const user = this.getUserById(userId);
    if (!user || user.readings.length === 0) {
      return null;
    }

    return user.readings.reduce((latest, current) => 
      new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
    );
  }

  getReadingsCount(): { [userId: string]: number } {
    const counts: { [userId: string]: number } = {};
    this.dataStore.forEach(user => {
      counts[user.userId] = user.readings.length;
    });
    return counts;
  }
}