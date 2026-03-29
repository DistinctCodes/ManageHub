import { Module } from '@nestjs/common';
import { CertificateDownloadController } from './certificate-download.controller';
import { CertificateDownloadService } from './certificate-download.service';

@Module({
  controllers: [CertificateDownloadController],
  providers: [CertificateDownloadService],
})
export class CertificateDownloadModule {}
