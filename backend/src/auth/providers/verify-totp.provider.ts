import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { verifySync } from 'otplib';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { JwtHelper } from '../helper/jwt-helper';
import { VerifyTotpDto } from '../dto/verify-totp.dto';
import { UseBackupCodeDto } from '../dto/use-backup-code.dto';

@Injectable()
export class VerifyTotpProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtHelper: JwtHelper,
  ) {}

  async verifyTotpLogin(dto: VerifyTotpDto) {
    const payload = this.jwtHelper.verifyTempToken(dto.tempToken);
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user || !user.totpSecret) {
      throw new UnauthorizedException('User not found or 2FA not set up');
    }

    const result = verifySync({ token: dto.token, secret: user.totpSecret });
    if (!result?.valid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    const tokens = this.jwtHelper.generateTokens(user);
    return {
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async verifyBackupCode(dto: UseBackupCodeDto) {
    const payload = this.jwtHelper.verifyTempToken(dto.tempToken);
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user || !user.totpBackupCodes?.length) {
      throw new UnauthorizedException(
        'User not found or no backup codes available',
      );
    }

    let matchedIndex = -1;
    for (let i = 0; i < user.totpBackupCodes.length; i++) {
      const match = await bcrypt.compare(
        dto.backupCode,
        user.totpBackupCodes[i],
      );
      if (match) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      throw new UnauthorizedException('Invalid backup code');
    }

    // Remove the used code
    user.totpBackupCodes = user.totpBackupCodes.filter(
      (_, i) => i !== matchedIndex,
    );
    await this.usersRepository.save(user);

    const tokens = this.jwtHelper.generateTokens(user);
    return {
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens,
      backupCodesRemaining: user.totpBackupCodes.length,
    };
  }
}
