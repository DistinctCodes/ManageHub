import { Injectable, Logger } from '@nestjs/common';
import { CheckinRecord } from '../interfaces/checkin-record.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class CsvGeneratorService {
  private readonly logger = new Logger(CsvGeneratorService.name);
  private readonly exportDir = path.join(process.cwd(), 'exports');

  constructor() {
    this.ensureExportDirectoryExists();
  }

  async generateCsv(
    records: CheckinRecord[],
    fileName?: string,
    includePersonalData = true,
  ): Promise<{ filePath: string; fileName: string; fileSize: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalFileName = fileName || `checkin-export-${timestamp}.csv`;
    const filePath = path.join(this.exportDir, finalFileName);

    this.logger.log(`Generating CSV file: ${finalFileName} with ${records.length} records`);

    try {
      const csvContent = this.convertToCsv(records, includePersonalData);
      await fs.writeFile(filePath, csvContent, 'utf8');
      
      const stats = await fs.stat(filePath);
      
      this.logger.log(`CSV file generated successfully: ${filePath} (${stats.size} bytes)`);
      
      return {
        filePath,
        fileName: finalFileName,
        fileSize: stats.size,
      };
    } catch (error) {
      this.logger.error(`Failed to generate CSV file: ${error.message}`, error.stack);
      throw new Error(`CSV generation failed: ${error.message}`);
    }
  }

  private convertToCsv(records: CheckinRecord[], includePersonalData: boolean): string {
    if (records.length === 0) {
      return this.getCsvHeaders(includePersonalData);
    }

    const headers = this.getCsvHeaders(includePersonalData);
    const rows = records.map(record => this.recordToCsvRow(record, includePersonalData));
    
    return [headers, ...rows].join('\n');
  }

  private getCsvHeaders(includePersonalData: boolean): string {
    const baseHeaders = [
      'User ID',
      'Check-in Date',
      'Check-in Time',
      'Heart Rate (bpm)',
      'Systolic BP (mmHg)',
      'Diastolic BP (mmHg)',
      'Temperature (°C)',
      'Oxygen Saturation (%)',
      'BMI',
      'Steps',
      'Sleep Hours',
      'Stress Level (1-10)',
      'Health Status',
      'Notes',
    ];

    const personalHeaders = [
      'User Name',
      'Email',
      'Department',
      'Weight (kg)',
      'Height (cm)',
    ];

    if (includePersonalData) {
      // Insert personal data headers after User ID
      return [
        baseHeaders[0], // User ID
        ...personalHeaders,
        ...baseHeaders.slice(1),
      ]
        .map(header => this.escapeCsvValue(header))
        .join(',');
    }

    return baseHeaders
      .map(header => this.escapeCsvValue(header))
      .join(',');
  }

  private recordToCsvRow(record: CheckinRecord, includePersonalData: boolean): string {
    const baseValues = [
      record.userId,
      record.checkInDate,
      record.checkInTime,
      record.heartRate.toString(),
      record.systolicBP.toString(),
      record.diastolicBP.toString(),
      record.temperature.toString(),
      record.oxygenSaturation.toString(),
      record.bmi.toString(),
      record.steps.toString(),
      record.sleepHours.toString(),
      record.stressLevel.toString(),
      record.healthStatus,
      record.notes || '',
    ];

    const personalValues = [
      record.userName,
      record.email,
      record.department,
      record.weight.toString(),
      record.height.toString(),
    ];

    let values: string[];
    if (includePersonalData) {
      values = [
        baseValues[0], // User ID
        ...personalValues,
        ...baseValues.slice(1),
      ];
    } else {
      values = baseValues;
    }

    return values
      .map(value => this.escapeCsvValue(value))
      .join(',');
  }

  private escapeCsvValue(value: string): string {
    // Handle null, undefined, or empty values
    if (value === null || value === undefined) {
      return '""';
    }

    const stringValue = value.toString();

    // If the value contains comma, double quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  async generateJsonExport(
    records: CheckinRecord[],
    fileName?: string,
  ): Promise<{ filePath: string; fileName: string; fileSize: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalFileName = fileName || `checkin-export-${timestamp}.json`;
    const filePath = path.join(this.exportDir, finalFileName);

    this.logger.log(`Generating JSON file: ${finalFileName} with ${records.length} records`);

    try {
      const jsonContent = JSON.stringify({
        exportDate: new Date().toISOString(),
        recordCount: records.length,
        data: records,
      }, null, 2);

      await fs.writeFile(filePath, jsonContent, 'utf8');
      
      const stats = await fs.stat(filePath);
      
      this.logger.log(`JSON file generated successfully: ${filePath} (${stats.size} bytes)`);
      
      return {
        filePath,
        fileName: finalFileName,
        fileSize: stats.size,
      };
    } catch (error) {
      this.logger.error(`Failed to generate JSON file: ${error.message}`, error.stack);
      throw new Error(`JSON generation failed: ${error.message}`);
    }
  }

  private async ensureExportDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.exportDir);
    } catch {
      await fs.mkdir(this.exportDir, { recursive: true });
      this.logger.log(`Created export directory: ${this.exportDir}`);
    }
  }

  async listExportFiles(): Promise<{ fileName: string; size: number; created: Date }[]> {
    try {
      const files = await fs.readdir(this.exportDir);
      const fileStats = await Promise.all(
        files.map(async (fileName) => {
          const filePath = path.join(this.exportDir, fileName);
          const stats = await fs.stat(filePath);
          return {
            fileName,
            size: stats.size,
            created: stats.birthtime,
          };
        }),
      );
      
      return fileStats.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      this.logger.error(`Failed to list export files: ${error.message}`);
      return [];
    }
  }

  async deleteExportFile(fileName: string): Promise<boolean> {
    try {
      const filePath = path.join(this.exportDir, fileName);
      await fs.unlink(filePath);
      this.logger.log(`Deleted export file: ${fileName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete export file ${fileName}: ${error.message}`);
      return false;
    }
  }

  getExportFilePath(fileName: string): string {
    return path.join(this.exportDir, fileName);
  }
}