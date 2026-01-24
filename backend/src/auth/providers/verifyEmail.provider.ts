import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ErrorCatch } from '../../utils/error';

@Injectable()
export class VerifyEmailProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  public async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      const user = await this.usersRepository.findOne({
        where: { verificationToken: token },
      });

      if (!user) {
        throw new BadRequestException('Invalid verification token');
      }

      if (
        user.verificationTokenExpiry &&
        new Date() > user.verificationTokenExpiry
      ) {
        throw new BadRequestException('Verification token has expired');
      }

      if (user.isVerified) {
        throw new BadRequestException('Email is already verified');
      }

      await this.usersRepository.update(user.id, {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      });

      return { message: 'Email verified successfully' };
    } catch (error) {
      ErrorCatch(error, 'Failed to verify email');
    }
  }
}
