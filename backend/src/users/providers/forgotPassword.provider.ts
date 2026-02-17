import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { ErrorCatch } from '../../utils/error';
import { EmailService } from '../../email/email.service';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class ForgotPasswordProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly emailService: EmailService,

    private readonly configService: ConfigService,
  ) {}

  async execute(email: string) {
    try {
      const user = await this.usersRepository.findOne({ where: { email } });
      if (!user) {
        throw new NotFoundException('Email not registered');
      }

      const rawToken = randomBytes(32).toString('hex');
      const hashedToken = createHash('sha256').update(rawToken).digest('hex');

      // expiration in ms (default 5 minutes)
      const expirationMs = parseInt(
        this.configService.get<string>('PASSWORD_RESET_EXPIRATION_MS') ||
          '300000',
      );
      user.passwordResetToken = hashedToken;
      user.passwordResetExpiresIn = new Date(Date.now() + expirationMs);

      await this.usersRepository.save(user);

      const frontendBase =
        this.configService.get<string>('FRONTEND_PASSWORD_RESET_URL') ||
        'https://managehub.vercel.app/reset-password?token=';
      const resetLink = `${frontendBase}${rawToken}`;

      const fullName = `${user.firstname} ${user.lastname}`.trim();
      const emailed = await this.emailService.sendPasswordResetLinkEmail(
        user.email,
        fullName || user.email,
        resetLink,
      );

      if (!emailed) {
        throw new BadRequestException('Failed to send password reset email');
      }

      return { message: 'Password reset instructions sent to email' };
    } catch (error) {
      ErrorCatch(error, 'Failed to initiate password reset');
    }
  }
}
