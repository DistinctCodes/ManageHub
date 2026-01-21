import {
  Injectable,
  BadRequestException,
  NotFoundException,
  TooManyRequestsException,
} from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';
import { UsersService } from 'src/users/providers/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private emailService: EmailService,
  ) {}

  async verifyEmail(token: string) {
    // 1. Find user by verification token
    const user = await this.usersService.findByVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    // 2. Check expiry (24 hours)
    if (new Date() > user.verificationTokenExp) {
      throw new BadRequestException('Verification token has expired');
    }

    // 3. Mark verified, active, and clear token
    await this.usersService.update(user.id, {
      isVerified: true,
      status: 'active',
      verificationToken: null,
      verificationTokenExp: null,
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // 4. Rate Limiting (1 per minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    if (
      user.lastVerificationSentAt &&
      user.lastVerificationSentAt > oneMinuteAgo
    ) {
      throw new TooManyRequestsException(
        'Please wait 60 seconds before resending',
      );
    }

    // 5. Generate new token (24h expiry)
    const token = randomBytes(32).toString('hex');
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);

    // Update user with new token and timestamp
    await this.usersService.update(user.id, {
      verificationToken: token,
      verificationTokenExp: expiryDate,
      lastVerificationSentAt: new Date(),
    });

    // 6. Send Email
    await this.emailService.sendVerificationEmail(user.email, token);

    return { message: 'Verification email sent' };
  }
}
