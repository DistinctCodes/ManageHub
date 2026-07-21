import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { ErrorCatch } from '../../utils/error';
import { createHash } from 'crypto';
import { HashingProvider } from 'src/auth/providers/hashing.provider';
import { RefreshTokenRepositoryOperations } from 'src/auth/providers/refreshToken.repository';
import { EmailService } from '../../email/email.service';

@Injectable()
export class ResetPasswordProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly hashingProvider: HashingProvider,

    private readonly refreshTokenRepositoryOperations: RefreshTokenRepositoryOperations,

    private readonly emailService: EmailService,
  ) {}

  async execute(rawToken: string, newPassword: string) {
    try {
      const hashedToken = createHash('sha256').update(rawToken).digest('hex');
      const now = new Date();

      const user = await this.usersRepository.findOne({
        where: {
          passwordResetToken: hashedToken,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid reset token');
      }

      if (!user.passwordResetExpiresIn || user.passwordResetExpiresIn < now) {
        throw new BadRequestException('Reset token has expired');
      }

      const hashedPassword = await this.hashingProvider.hash(newPassword);
      user.password = hashedPassword;
      user.passwordResetToken = null;
      user.passwordResetExpiresIn = null;

      await this.usersRepository.save(user);

      // Revoke all existing refresh tokens to force re-login on other sessions
      await this.refreshTokenRepositoryOperations.revokeAllRefreshTokens(
        user.id,
      );

      // Send password-reset-success email
      const fullName = `${user.firstname} ${user.lastname}`.trim();
      const emailed = await this.emailService.sendPasswordResetSuccessEmail(
        user.email,
        fullName || user.email,
      );

      if (!emailed) {
        throw new BadRequestException(
          'Failed to send password success reset email',
        );
      }

      return { message: 'Password reset successful' };
    } catch (error) {
      ErrorCatch(error, 'Failed to reset password');
    }
  }
}
