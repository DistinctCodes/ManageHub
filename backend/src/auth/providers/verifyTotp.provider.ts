import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { verifySync } from 'otplib';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { JwtHelper } from '../helper/jwt-helper';
import { UserHelper } from '../helper/user-helper';

@Injectable()
export class VerifyTotpProvider {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtHelper: JwtHelper,
    private readonly userHelper: UserHelper,
  ) {}

  async verifyTotpLogin(token: string, tempToken: string) {
    const userId = this.jwtHelper.validateTempToken(tempToken);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorEnabled || !user.totpSecret) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    const isValid = verifySync({
      token,
      secret: user.totpSecret,
      strategy: 'totp',
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    return {
      user: this.userHelper.formatUserResponse(user),
      accessToken: this.jwtHelper.generateAccessToken(user),
    };
  }

  async verifyBackupCode(backupCode: string, tempToken: string) {
    const userId = this.jwtHelper.validateTempToken(tempToken);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedCodes = user.totpBackupCodes ?? [];
    const matchedIndex = await this.findMatchingBackupCodeIndex(
      backupCode,
      hashedCodes,
    );

    if (matchedIndex === -1) {
      throw new UnauthorizedException('Invalid backup code');
    }

    hashedCodes.splice(matchedIndex, 1);
    user.totpBackupCodes = hashedCodes;
    await this.userRepository.save(user);

    return {
      user: this.userHelper.formatUserResponse(user),
      accessToken: this.jwtHelper.generateAccessToken(user),
    };
  }

  private async findMatchingBackupCodeIndex(
    backupCode: string,
    hashedCodes: string[],
  ) {
    for (let index = 0; index < hashedCodes.length; index += 1) {
      if (await bcrypt.compare(backupCode, hashedCodes[index])) {
        return index;
      }
    }

    return -1;
  }
}
