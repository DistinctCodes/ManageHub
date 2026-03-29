import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SetupTotpProvider {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async initiate2faSetup(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secret = generateSecret();
    const appName = process.env.TOTP_APP_NAME ?? 'ManageHub';
    const otpauthUrl = generateURI({
      secret,
      issuer: appName,
      label: user.email,
      strategy: 'totp',
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    user.totpSecret = secret;
    await this.userRepository.save(user);

    return { secret, qrCodeDataUrl };
  }

  async confirm2faSetup(userId: string, token: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.totpSecret) {
      throw new BadRequestException('2FA setup has not been initiated');
    }

    const isValid = verifySync({
      token,
      secret: user.totpSecret,
      strategy: 'totp',
    });

    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code');
    }

    const backupCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(-10).toUpperCase()
    );

    const hashedBackupCodes = await Promise.all(
      backupCodes.map((backupCode) => bcrypt.hash(backupCode, 10))
    );

    user.twoFactorEnabled = true;
    user.totpBackupCodes = hashedBackupCodes;
    await this.userRepository.save(user);

    return { backupCodes };
  }
}
