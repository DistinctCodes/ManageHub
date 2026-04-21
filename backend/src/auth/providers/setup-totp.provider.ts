import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateSecret, generateURI } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../users/entities/user.entity';
import { Setup2faDto } from '../dto/setup-2fa.dto';
import { verifySync } from 'otplib';

@Injectable()
export class SetupTotpProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async initiate2faSetup(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const secret = generateSecret();
    user.totpSecret = secret;
    await this.usersRepository.save(user);

    const otpauth = generateURI({ issuer: 'ManageHub', label: user.email, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    return { secret, qrCodeDataUrl };
  }

  async confirm2faSetup(userId: string, dto: Setup2faDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || !user.totpSecret) {
      throw new UnauthorizedException('2FA setup not initiated');
    }

    const result = verifySync({ token: dto.token, secret: user.totpSecret });
    if (!result?.valid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    // Generate 8 plain backup codes, store hashed
    const plainCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(5).toString('hex'),
    );
    const hashedCodes = await Promise.all(
      plainCodes.map((c) => bcrypt.hash(c, 10)),
    );

    user.twoFactorEnabled = true;
    user.totpBackupCodes = hashedCodes;
    await this.usersRepository.save(user);

    return { backupCodes: plainCodes };
  }
}
