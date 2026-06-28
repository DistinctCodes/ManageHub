import { Injectable, BadRequestException } from '@nestjs/common';
import { CheckInProvider } from './providers/check-in.provider';
import { OccupancyProvider } from './providers/occupancy.provider';
import { BiometricAuthProvider } from './providers/biometric-auth.provider';
import { CheckInDto } from './dto/check-in.dto';
import { OccupancyQueryDto } from './dto/occupancy-query.dto';

@Injectable()
export class WorkspaceTrackingService {
  constructor(
    private readonly checkInProvider: CheckInProvider,
    private readonly occupancyProvider: OccupancyProvider,
    private readonly biometricAuthProvider: BiometricAuthProvider,
  ) {}

  checkIn(dto: CheckInDto, userId: string) {
    return this.checkInProvider.checkIn(dto, userId);
  }

  checkOut(logId: string, userId: string) {
    return this.checkInProvider.checkOut(logId, userId);
  }

  getActiveCheckIn(userId: string, workspaceId?: string) {
    return this.checkInProvider.getActiveCheckIn(userId, workspaceId);
  }

  getCurrentOccupancy(workspaceId?: string) {
    return this.occupancyProvider.getCurrentOccupancy(workspaceId);
  }

  getUtilizationStats(query: OccupancyQueryDto) {
    return this.occupancyProvider.getUtilizationStats(query);
  }

  getRecentLogs(workspaceId?: string, limit?: number) {
    return this.occupancyProvider.getRecentLogs(workspaceId, limit);
  }

  generateRegistrationChallenge(userId: string) {
    return this.biometricAuthProvider.generateRegistrationChallenge(userId);
  }

  async verifyRegistration(
    userId: string,
    response: {
      challenge: string;
      credentialId: string;
      credentialPublicKey: string;
    },
  ) {
    return this.biometricAuthProvider.verifyRegistration(userId, response);
  }

  async generateBiometricAuthChallenge(userId: string) {
    return this.biometricAuthProvider.generateAuthenticationChallenge(userId);
  }

  async biometricCheckIn(
    dto: CheckInDto & { credentialId: string },
    userId: string,
  ) {
    const user = await this.biometricAuthProvider.validateCredential(
      userId,
      dto.credentialId,
    );
    if (!user) {
      throw new BadRequestException('Invalid biometric credential');
    }
    return this.checkInProvider.checkIn(dto, userId);
  }

  async biometricCheckOut(
    logId: string,
    userId: string,
    body: { credentialId: string },
  ) {
    const user = await this.biometricAuthProvider.validateCredential(
      userId,
      body.credentialId,
    );
    if (!user) {
      throw new BadRequestException('Invalid biometric credential');
    }
    return this.checkInProvider.checkOut(logId, userId);
  }
}
