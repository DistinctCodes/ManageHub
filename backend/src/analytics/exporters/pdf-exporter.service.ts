import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class PdfExporterService {
  async exportToPdf<T extends object>(
    data: T[],
    title: string = 'Report',
    includeCharts: boolean = false,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        this.addHeader(doc, title);

        // Generated timestamp
        doc
          .fontSize(10)
          .fillColor('#666666')
          .text(`Generated: ${new Date().toLocaleString()}`, {
            align: 'right',
          });

        doc.moveDown(2);

        if (data.length === 0) {
          doc.fontSize(12).fillColor('#000000').text('No data available');
        } else {
          // Add table
          this.addTable(doc, data);
        }

        // Footer
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(doc: any, title: string): void {
    // Logo placeholder
    doc.rect(50, 45, 40, 40).fillColor('#4472C4').fill();

    doc.fillColor('#FFFFFF').fontSize(20).text('MH', 55, 55);

    // Title
    doc.fillColor('#1a1a1a').fontSize(24).text(title, 100, 55);

    doc
      .moveTo(50, 100)
      .lineTo(550, 100)
      .strokeColor('#4472C4')
      .lineWidth(2)
      .stroke();

    doc.moveDown(2);
  }

  private addTable<T extends object>(doc: any, data: T[]): void {
    const headers = Object.keys(data[0]);
    const columnWidth = (500 - (headers.length - 1) * 10) / headers.length;
    const startX = 50;
    let startY = doc.y + 20;

    // Table header
    doc.fillColor('#4472C4');
    doc.rect(startX, startY, 500, 25).fill();

    doc.fillColor('#FFFFFF').fontSize(10);
    headers.forEach((header, index) => {
      const formattedHeader = header.replace(/([A-Z])/g, ' $1').trim();
      doc.text(
        formattedHeader,
        startX + index * (columnWidth + 10) + 5,
        startY + 8,
        { width: columnWidth - 10, align: 'left' },
      );
    });

    startY += 25;

    // Table rows
    doc.fillColor('#000000').fontSize(9);
    data.forEach((row, rowIndex) => {
      // Check if we need a new page
      if (startY > 700) {
        doc.addPage();
        startY = 50;
      }

      // Alternate row background
      if (rowIndex % 2 === 0) {
        doc.fillColor('#F5F5F5');
        doc.rect(startX, startY, 500, 22).fill();
      }

      doc.fillColor('#000000');
      Object.values(row).forEach((value, colIndex) => {
        const displayValue =
          value !== null && value !== undefined
            ? String(value).substring(0, 20)
            : '-';
        doc.text(
          displayValue,
          startX + colIndex * (columnWidth + 10) + 5,
          startY + 6,
          { width: columnWidth - 10, align: 'left' },
        );
      });

      startY += 22;
    });

    // Table border
    doc
      .rect(startX, doc.y - (data.length * 22 + 25), 500, data.length * 22 + 25)
      .strokeColor('#CCCCCC')
      .stroke();
  }

  private addFooter(doc: any): void {
    const pageCount = doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      doc
        .fontSize(8)
        .fillColor('#666666')
        .text(`ManageHub Analytics | Page ${i + 1} of ${pageCount}`, 50, 750, {
          align: 'center',
        });
    }
  }

  async exportDashboardReport(
    dashboardStats: Record<string, any>,
    title: string = 'Dashboard Report',
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.addHeader(doc, title);

        doc
          .fontSize(10)
          .fillColor('#666666')
          .text(`Generated: ${new Date().toLocaleString()}`, {
            align: 'right',
          });

        doc.moveDown(3);

        // Stats cards
        const stats = Object.entries(dashboardStats);
        const cardWidth = 150;
        const cardHeight = 80;
        const cardsPerRow = 3;
        let x = 50;
        let y = doc.y;

        stats.forEach(([key, value], index) => {
          if (index > 0 && index % cardsPerRow === 0) {
            x = 50;
            y += cardHeight + 20;
          }

          // Card background
          doc.rect(x, y, cardWidth, cardHeight).fillColor('#F8F9FA').fill();

          // Card border
          doc.rect(x, y, cardWidth, cardHeight).strokeColor('#E0E0E0').stroke();

          // Card content
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase());

          doc
            .fillColor('#666666')
            .fontSize(9)
            .text(formattedKey, x + 10, y + 15, {
              width: cardWidth - 20,
            });

          doc
            .fillColor('#1a1a1a')
            .fontSize(18)
            .text(String(value), x + 10, y + 40, {
              width: cardWidth - 20,
            });

          x += cardWidth + 20;
        });

        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
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
    return this.exportToPdf(data, title || 'Attendance Report');
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
    return this.exportToPdf(data, title || 'Revenue Report');
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
    return this.exportToPdf(data, title || 'Member Report');
  }

  async exportOccupancyReport(
    data: {
      date: string;
      occupancy: number;
      occupancyRate: number;
    }[],
    title?: string,
  ): Promise<Buffer> {
    return this.exportToPdf(data, title || 'Occupancy Report');
  }

  getContentType(): string {
    return 'application/pdf';
  }

  getFileExtension(): string {
    return 'pdf';
  }
}
