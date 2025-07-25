import { Injectable } from '@nestjs/common';
@Injectable()
export class ErrorSimulatorService {
  simulateError(): { type: string; message: string } | null {
    // Stub: Randomly return an error or null
    return null;
  }
} 