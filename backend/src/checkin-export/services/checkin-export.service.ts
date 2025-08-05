import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BiometricDataService } from './biometric-data.service';
import { CsvGeneratorService } from './csv-generator.service';
import { ExportFiltersDto, ExportFormat } from '../dto/export-filters.dto';
import { CheckinRecord, ExportResult } from '../interfaces/checkin-record.interface';
import { BiometricReading, UserBiometricData } from '../interfaces/biometric-data.interface';

@Injectable()
export class CheckinExportService {
  private readonly logger = new Logger(CheckinExportService.name);

  constructor(
    private readonly biometricDataService: BiometricDataService,
    private readonly csvGeneratorService: CsvGeneratorService,
  ) {}

  async exportCheckinData(filters: ExportFiltersDto): Promise<ExportResult> {
    this.logger.log('Starting check-in data export with filters:', JSON.stringify(filters));

    try {
      // Validate date range
      this.validateDateRange(filters.startDate, filters.endDate);

      // Get filtered data
      const userData = this.getFilteredUserData(filters);
      
      // Transform to check-in records
      const checkinRecords = this.transformToCheckinRecords(userData, filters);
      
      // Apply additional filters
      const filteredRecords = this.applyAdditionalFilters(checkinRecords, filters);

      this.logger.log(`Generated ${filteredRecords.length} check-in records for export`);

      // Generate export file
      const fileResult = await this.generateExportFile(filteredRecords, filters);

      const exportResult: ExportResult = {
        fileName: fileResult.fileName,
        filePath: fileResult.filePath,
        recordCount: filteredRecords.length,
        exportDate: new Date(),
        fileSize: fileResult.fileSize,
      };

      this.logger.log(`Export completed successfully: ${exportResult.fileName}`);
      return exportResult;

    } catch (error) {
      this.logger.error(`Export failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private validateDateRange(startDate?: string, endDate?: string): void {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        throw new BadRequestException('Start date must be before end date');
      }
      
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 365) {
        throw new BadRequestException('Date range cannot exceed 365 days');
      }
    }
  }

  private getFilteredUserData(filters: ExportFiltersDto): UserBiometricData[] {
    let userData: UserBiometricData[];

    // Get data by date range or all data
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      userData = this.biometricDataService.getUsersByDateRange(startDate, endDate);
    } else {
      userData = this.biometricDataService.getAllUsers();
    }

    // Filter by specific user IDs
    if (filters.userIds && filters.userIds.length > 0) {
      userData = userData.filter(user => filters.userIds!.includes(user.userId));
    }

    // Filter by departments
    if (filters.departments && filters.departments.length > 0) {
      userData = userData.filter(user => filters.departments!.includes(user.department));
    }

    return userData;
  }

  private transformToCheckinRecords(
    userData: UserBiometricData[],
    filters: ExportFiltersDto,
  ): CheckinRecord[] {
    const records: CheckinRecord[] = [];

    userData.forEach(user => {
      user.readings.forEach(reading => {
        const checkinRecord = this.createCheckinRecord(user, reading);
        
        // Apply date filter to individual readings if needed
        if (this.isWithinDateRange(reading.timestamp, filters.startDate, filters.endDate)) {
          records.push(checkinRecord);
        }
      });
    });

    return records.sort((a, b) => 
      new Date(b.checkInDate + 'T' + b.checkInTime).getTime() - 
      new Date(a.checkInDate + 'T' + a.checkInTime).getTime()
    );
  }

  private createCheckinRecord(user: UserBiometricData, reading: BiometricReading): CheckinRecord {
    const checkInDate = reading.timestamp.toISOString().split('T')[0];
    const checkInTime = reading.timestamp.toTimeString().slice(0, 8);
    const bmi = this.calculateBMI(reading.weight, reading.height);
    const healthStatus = this.determineHealthStatus(reading);

    return {
      userId: user.userId,
      userName: user.userName,
      email: user.email,
      department: user.department,
      checkInDate,
      checkInTime,
      heartRate: reading.heartRate,
      systolicBP: reading.bloodPressure.systolic,
      diastolicBP: reading.bloodPressure.diastolic,
      temperature: reading.temperature,
      oxygenSaturation: reading.oxygenSaturation,
      weight: reading.weight,
      height: reading.height,
      bmi,
      steps: reading.steps,
      sleepHours: reading.sleepHours,
      stressLevel: reading.stressLevel,
      healthStatus,
      notes: this.generateHealthNotes(reading, healthStatus),
    };
  }

  private calculateBMI(weight: number, height: number): number {
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10;
  }