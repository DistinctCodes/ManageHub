import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { HashingProvider } from './hashing.provider';
import { Disable2faDto } from '../dto/disable-2fa.dto';

@Injectable()
export class ManageTotpProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly hashingProvider: HashingProvider,
  ) {}

  async disable2fa(userId: string, dto: Disable2faDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const passwordValid = await this.hashingProvider.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    user.twoFactorEnabled = false;
    user.totpSecret = null;
    user.totpBackupCodes = null;
    await this.usersRepository.save(user);

    return { message: '2FA has been disabled' };
  }

  async get2faStatus(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    return {
      enabled: user.twoFactorEnabled,
      backupCodesRemaining: user.totpBackupCodes?.length ?? 0,
    };
  }
}
