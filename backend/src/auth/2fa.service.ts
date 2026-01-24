// two-factor.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwoFactorSecret } from './entities/two-fa.entity';
import { BackupCode } from './entities/backup-code.entity';
import { UsersService } from 'src/users/providers/users.service';
import { SmsService } from 'src/sms/sms.service';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(TwoFactorSecret)
    private readonly twoFactorRepo: Repository<TwoFactorSecret>,

    @InjectRepository(BackupCode)
    private readonly backupRepo: Repository<BackupCode>,

    private readonly usersService: UsersService,
    private readonly smsService: SmsService,
  ) {}

  async setup2FA(userId: string) {
    const secret = speakeasy.generateSecret({ length: 20 });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    const encryptedSecret = crypto
      .createCipheriv(
        'aes-256-cbc',
        Buffer.from(process.env.TWO_FA_ENCRYPTION_KEY),
        Buffer.from(process.env.TWO_FA_IV),
      )
      .update(secret.base32, 'utf8', 'hex');

    await this.twoFactorRepo.save({
      encryptedSecret,
      user: { id: userId },
    });

    return {
      qrCode,
      manualKey: secret.base32,
    };
  }

  async verifyTOTP(userId: string, token: string) {
    const record = await this.twoFactorRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!record || record.lockedUntil > new Date()) {
      throw new ForbiddenException('2FA locked or not setup');
    }

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(process.env.TWO_FA_ENCRYPTION_KEY),
      Buffer.from(process.env.TWO_FA_IV),
    );

    const secret = decipher.update(record.encryptedSecret, 'hex', 'utf8');

    const valid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!valid) {
      record.failedAttempts += 1;

      if (record.failedAttempts >= 10) {
        record.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }

      await this.twoFactorRepo.save(record);
      throw new BadRequestException('Invalid 2FA code');
    }

    record.failedAttempts = 0;
    await this.twoFactorRepo.save(record);
    return true;
  }

  async enable2FA(userId: string) {
    await this.twoFactorRepo.update(
      { user: { id: userId } },
      { isEnabled: true },
    );

    await this.usersService.update(userId, { twoFactorEnabled: true });
  }

  async generateBackupCodes(userId: string) {
    await this.backupRepo.delete({ user: { id: userId } });

    const codes = Array.from({ length: 10 }).map(() =>
      crypto.randomBytes(4).toString('hex'),
    );

    for (const code of codes) {
      await this.backupRepo.save({
        codeHash: await bcrypt.hash(code, 10),
        user: { id: userId },
      });
    }

    return codes;
  }

  async verifyBackupCode(userId: string, code: string) {
    const backups = await this.backupRepo.find({
      where: { user: { id: userId }, used: false },
    });

    for (const backup of backups) {
      if (await bcrypt.compare(code, backup.codeHash)) {
        backup.used = true;
        await this.backupRepo.save(backup);
        return true;
      }
    }

    throw new BadRequestException('Invalid backup code');
  }
}
