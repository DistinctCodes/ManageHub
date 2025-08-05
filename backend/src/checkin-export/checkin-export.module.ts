import { Module } from '@nestjs/common';
import { CheckinExportController } from './controllers/checkin-export.controller';
import { CheckinExportService } from './services/checkin-export.service';
import { BiometricDataService } from './services/biometric-data.service';
import { CsvGeneratorService } from './services/csv-generator.service';

@Module({
  controllers: [CheckinExportController],
  providers: [
    CheckinExportService,
    BiometricDataService,
    CsvGeneratorService,
  ],
  exports: [
    CheckinExportService,
    BiometricDataService,
    CsvGeneratorService,
  ],
})
export class CheckinExportModule {}