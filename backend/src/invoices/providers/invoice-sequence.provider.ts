import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Ensures the PostgreSQL sequence used for invoice numbers exists.
 * Runs once on application bootstrap.
 */
@Injectable()
export class InvoiceSequenceProvider implements OnApplicationBootstrap {
  private readonly logger = new Logger(InvoiceSequenceProvider.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.dataSource.query(
        `CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1`,
      );
      this.logger.log('invoice_number_seq sequence ensured');
    } catch (err) {
      this.logger.error(
        `Failed to create invoice_number_seq: ${(err as Error).message}`,
      );
    }
  }
}
