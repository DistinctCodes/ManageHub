import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';
import { UsersService } from 'src/users/providers/users.service';
import { ForgotPasswordDto } from './dto/forgotPassword.dto';
import { ValidateResetTokenDto } from './dto/validate-reset-token.dto';
import { ResetPasswordDto } from './dto/resetPassword.dto';
import { HashingProvider } from './providers/hashing.provider';
import { RefreshTokenRepositoryOperations } from './providers/RefreshTokenCrud.repository';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private emailService: EmailService,
    private hashingProvider: HashingProvider,
    private refreshTokenRepositoryOperations: RefreshTokenRepositoryOperations,
  ) {}

  async verifyEmail(token: string) {
    // 1. Find user by verification token
    const user = await this.usersService.findByVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    // 2. Check expiry (24 hours)
    if (new Date() > user.verificationTokenExpiry) {
      throw new BadRequestException('Verification token has expired');
    }

    // 3. Mark verified, active, and clear token
    await this.usersService.updateUser(user.id, {
      isVerified: true,
      isActive: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findUserByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // 4. Rate Limiting (1 per minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    if (
      user.lastVerificationEmailSent &&
      user.lastVerificationEmailSent > oneMinuteAgo
    ) {
      throw new BadRequestException(
        'Please wait 60 seconds before resending',
      );
    }

    // 5. Generate new token (24h expiry)
    const token = randomBytes(32).toString('hex');
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);

    // Update user with new token and timestamp
    await this.usersService.updateUser(user.id, {
      verificationToken: token,
      verificationTokenExpiry: expiryDate,
      lastVerificationEmailSent: new Date(),
    });

    // 6. Send Email
    await this.emailService.sendVerificationEmail(user.email, token);

    return { message: 'Verification email sent' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.usersService.findUserByEmail(email);

    if (!user) {
      // Don't reveal if email exists or not for security
      return { message: 'If email is registered, password reset instructions have been sent' };
    }

    // Rate limiting: 3 requests per hour per email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (
      user.lastPasswordResetSentAt &&
      user.lastPasswordResetSentAt > oneHourAgo
    ) {
      throw new BadRequestException(
        'Too many password reset requests. Please wait 1 hour before trying again.',
      );
    }

    // Generate 32-byte random hex token
    const token = randomBytes(32).toString('hex');
    
    // Set token expiry to 1 hour
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1);

    // Update user with reset token and timestamp
    await this.usersService.updateUser(user.id, {
      passwordResetToken: token,
      passwordResetExpiresIn: expiryDate,
      lastPasswordResetSentAt: new Date(),
    });

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(user.email, token);

    return { message: 'Password reset instructions sent to email' };
  }

  async validateResetToken(validateResetTokenDto: ValidateResetTokenDto) {
    const { token } = validateResetTokenDto;
    
    const user = await this.usersService.findByPasswordResetToken(token);

    if (!user) {
      throw new BadRequestException('Invalid reset token');
    }

    if (!user.passwordResetExpiresIn || user.passwordResetExpiresIn < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    return { 
      message: 'Token is valid',
      email: user.email 
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;
    
    const user = await this.usersService.findByPasswordResetToken(token);

    if (!user) {
      throw new BadRequestException('Invalid reset token');
    }

    if (!user.passwordResetExpiresIn || user.passwordResetExpiresIn < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password with bcrypt (12 rounds)
    const hashedPassword = await this.hashingProvider.hash(newPassword);

    // Update user password and clear reset token
    await this.usersService.updateUser(user.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiresIn: null,
    });

    // Invalidate all user sessions
    await this.refreshTokenRepositoryOperations.revokeAllRefreshTokens(user.id);

    // Send confirmation email
    await this.emailService.sendPasswordChangedEmail(user.email);

    return { message: 'Password reset successful' };
  }
}
