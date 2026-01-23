import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import NodeClam from 'clamscan';
import { Buffer } from 'buffer';

@Injectable()
export class VirusScannerService {
  private scanner: any;

  constructor() {
    new NodeClam().init().then((clamscan) => {
      this.scanner = clamscan;
    });
  }

  async scan(buffer: Buffer) {
    if (!this.scanner) return;
    const { is_infected } = await this.scanner.scan_buffer(buffer);
    if (is_infected) throw new HttpException('Virus detected', HttpStatus.BAD_REQUEST);
  }
}
