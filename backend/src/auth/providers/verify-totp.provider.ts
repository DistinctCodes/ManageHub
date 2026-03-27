import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { OTP } from 'otplib';
import { User } from '../../users/entities/user.entity';
import { JwtHelper } from '../helper/jwt-helper';
import { GenerateTokensProvider } from './generateTokens.provider';

interface Pending2faPayload {
  sub: string;
  type: string;
}

const authenticator = new OTP({ strategy: 'totp' });

@Injectable()
export class VerifyTotpProvider {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtHelper: JwtHelper,
    private readonly generateTokensProvider: GenerateTokensProvider,
  ) {}

  async verifyTotpLogin(tempToken: string, token: string) {
    const payload = this.validatePending2faToken(tempToken);
    const user = await this.getUserOrThrow(payload.sub);

    const verificationResult = await authenticator.verify({
      token,
      secret: user.totpSecret ?? '',
    });

    if (!verificationResult.valid) {
      throw new UnauthorizedException('Invalid authentication code');
    }

    return this.generateTokensProvider.generateBothTokens(user);
  }

  async verifyBackupCode(tempToken: string, backupCode: string) {
    const payload = this.validatePending2faToken(tempToken);
    const user = await this.getUserOrThrow(payload.sub);

    if (!user.totpBackupCodes || user.totpBackupCodes.length === 0) {
      throw new UnauthorizedException('No backup codes remaining');
    }

    let matchedIndex = -1;

    for (let i = 0; i < user.totpBackupCodes.length; i++) {
      const hash = user.totpBackupCodes[i];
      if (await bcrypt.compare(backupCode, hash)) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex < 0) {
      throw new UnauthorizedException('Invalid backup code');
    }

    user.totpBackupCodes = user.totpBackupCodes.filter(
      (_code, index) => index !== matchedIndex,
    );

    await this.userRepository.save(user);

    const tokens = await this.generateTokensProvider.generateBothTokens(user);

    return {
      ...tokens,
      backupCodesRemaining: user.totpBackupCodes.length,
    };
  }

  private validatePending2faToken(tempToken: string): Pending2faPayload {
    const payload = this.jwtHelper.verifyWithSecret<Pending2faPayload>(tempToken);

    if (!payload?.sub || payload.type !== '2fa_pending') {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return payload;
  }

  private async getUserOrThrow(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
