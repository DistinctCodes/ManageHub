import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelExporterService {
  async exportToExcel<T extends object>(
    data: T[],
    sheetName: string = 'Report',
    title?: string,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ManageHub Analytics';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName);

    if (data.length === 0) {
      worksheet.addRow(['No data available']);
      return Buffer.from(await workbook.xlsx.writeBuffer());
    }

    // Add title row if provided
    if (title) {
      const titleRow = worksheet.addRow([title]);
      titleRow.font = { bold: true, size: 16 };
      titleRow.alignment = { horizontal: 'center' };
      worksheet.mergeCells(1, 1, 1, Object.keys(data[0]).length);
      worksheet.addRow([]); // Empty row for spacing
    }

    // Add headers
    const headers = Object.keys(data[0]);
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Add data rows
    data.forEach((row, index) => {
      const dataRow = worksheet.addRow(Object.values(row));

      // Alternate row colors
      if (index % 2 === 0) {
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value?.toString() || '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    // Add borders
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
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
    return this.exportToExcel(data, 'Attendance', title || 'Attendance Report');
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
    return this.exportToExcel(data, 'Revenue', title || 'Revenue Report');
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
    return this.exportToExcel(data, 'Members', title || 'Member Report');
  }

  async exportOccupancyReport(
    data: {
      date: string;
      occupancy: number;
      occupancyRate: number;
    }[],
    title?: string,
  ): Promise<Buffer> {
    return this.exportToExcel(data, 'Occupancy', title || 'Occupancy Report');
  }

  async exportDashboardReport(
    dashboardStats: Record<string, any>,
    title?: string,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ManageHub Analytics';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Dashboard');

    // Title
    if (title) {
      const titleRow = worksheet.addRow([title]);
      titleRow.font = { bold: true, size: 16 };
      worksheet.addRow([]);
    }

    // Add generated timestamp
    worksheet.addRow(['Generated At:', new Date().toISOString()]);
    worksheet.addRow([]);

    // Add stats as key-value pairs
    Object.entries(dashboardStats).forEach(([key, value]) => {
      const formattedKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase());
      worksheet.addRow([formattedKey, value]);
    });

    // Style
    worksheet.getColumn(1).font = { bold: true };
    worksheet.getColumn(1).width = 25;
    worksheet.getColumn(2).width = 20;

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  getContentType(): string {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  getFileExtension(): string {
    return 'xlsx';
  }
}
