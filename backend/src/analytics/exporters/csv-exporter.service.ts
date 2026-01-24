import { Injectable } from '@nestjs/common';
import { Parser } from 'json2csv';

@Injectable()
export class CsvExporterService {
  async exportToCsv<T extends object>(
    data: T[],
    fields?: string[],
    title?: string,
  ): Promise<Buffer> {
    if (!data || data.length === 0) {
      return Buffer.from('No data available');
    }

    const opts = fields ? { fields } : {};
    const parser = new Parser(opts);

    try {
      const csv = parser.parse(data);

      // Add title as header comment if provided
      const output = title
        ? `# ${title}\n# Generated at: ${new Date().toISOString()}\n\n${csv}`
        : csv;

      return Buffer.from(output, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to generate CSV: ${error.message}`);
    }
  }

  async exportAttendanceReport(
    data: {
      date: string;
      checkIns: number;
      checkOuts: number;
      averageHours: number;
    }[],
    title?: string,
  ): Promise<Buffer> {
    const fields = ['date', 'checkIns', 'checkOuts', 'averageHours'];
    return this.exportToCsv(data, fields, title || 'Attendance Report');
  }

  async exportRevenueReport(
    data: {
      date: string;
      revenue: number;
      transactions: number;
      averageTransaction: number;
    }[],
    title?: string,
  ): Promise<Buffer> {
    const fields = ['date', 'revenue', 'transactions', 'averageTransaction'];
    return this.exportToCsv(data, fields, title || 'Revenue Report');
  }

  async exportMemberReport(
    data: {
      date: string;
      totalMembers: number;
      newMembers: number;
      churnedMembers: number;
      netGrowth: number;
    }[],
    title?: string,
  ): Promise<Buffer> {
    const fields = [
      'date',
      'totalMembers',
      'newMembers',
      'churnedMembers',
      'netGrowth',
    ];
    return this.exportToCsv(data, fields, title || 'Member Report');
  }

  async exportOccupancyReport(
    data: {
      date: string;
      occupancy: number;
      occupancyRate: number;
    }[],
    title?: string,
  ): Promise<Buffer> {
    const fields = ['date', 'occupancy', 'occupancyRate'];
    return this.exportToCsv(data, fields, title || 'Occupancy Report');
  }

  getContentType(): string {
    return 'text/csv';
  }

  getFileExtension(): string {
    return 'csv';
  }
}
