import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserHelper } from '../helper/user-helper';

@Injectable()
export class ManageTotpProvider {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userHelper: UserHelper,
  ) {}

  async get2faStatus(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      twoFactorEnabled: !!user.twoFactorEnabled,
      hasBackupCodes: !!user.totpBackupCodes?.length,
    };
  }

  async disable2fa(userId: string, password: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await this.userHelper.verifyPassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    if (!user.twoFactorEnabled && !user.totpSecret && !user.totpBackupCodes) {
      throw new BadRequestException('2FA is not enabled');
    }

    user.twoFactorEnabled = false;
    user.totpSecret = null;
    user.totpBackupCodes = null;
    await this.userRepository.save(user);

    return { disabled: true };
  }
}
