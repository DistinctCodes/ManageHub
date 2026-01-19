// backend/src/auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, UserStatus } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from '../email/email.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, phone, password, fullName, membershipType } = registerDto;

    // Check if email already exists
    const existingUserByEmail = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if phone already exists
    const existingUserByPhone = await this.userRepository.findOne({
      where: { phone },
    });

    if (existingUserByPhone) {
      throw new ConflictException('Phone number already registered');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate email verification token
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationExpiry = new Date();
    emailVerificationExpiry.setHours(emailVerificationExpiry.getHours() + 24); // 24 hours

    // Create user
    const user = this.userRepository.create({
      fullName,
      email,
      phone,
      passwordHash,
      membershipType,
      status: UserStatus.PENDING_VERIFICATION,
      emailVerificationToken,
      emailVerificationExpiry,
    });

    try {
      await this.userRepository.save(user);

      // Send verification email
      const verificationEmailSent =
        await this.emailService.sendVerificationEmail(
          email,
          fullName,
          emailVerificationToken,
        );

      return {
        success: true,
        message:
          'Registration successful. Please check your email to verify your account.',
        data: {
          userId: user.id,
          email: user.email,
          verificationEmailSent,
        },
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw new InternalServerErrorException(
        'Failed to create account. Please try again.',
      );
    }
  }

  async resendVerificationEmail(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new token
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationExpiry = new Date();
    emailVerificationExpiry.setHours(emailVerificationExpiry.getHours() + 24);

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpiry = emailVerificationExpiry;

    await this.userRepository.save(user);

    // Send email
    const sent = await this.emailService.sendVerificationEmail(
      email,
      user.fullName,
      emailVerificationToken,
    );

    return {
      success: true,
      message: 'Verification email sent successfully',
      data: { emailSent: sent },
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { token } = verifyEmailDto;

    // Find user with this token
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Check if already verified
    if (user.emailVerified) {
      return {
        success: true,
        message: 'Email already verified',
        data: {
          email: user.email,
          verified: true,
        },
      };
    }

    // Check if token has expired
    const now = new Date();
    if (!user.emailVerificationExpiry || user.emailVerificationExpiry < now) {
      throw new BadRequestException(
        'Verification token has expired. Please request a new one.',
      );
    }

    // Update user
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiry = null;
    user.status = UserStatus.ACTIVE; // Change status from PENDING_VERIFICATION to ACTIVE

    try {
      await this.userRepository.save(user);
      this.emailService.sendWelcomeEmail(user.email, user.fullName);

      return {
        success: true,
        message: 'Email verified successfully',
        data: {
          email: user.email,
          verified: true,
        },
      };
    } catch (error) {
      console.error('Email verification error:', error);
      throw new InternalServerErrorException(
        'Failed to verify email. Please try again.',
      );
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    // Check account status
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Your account has been suspended. Please contact support.',
      );
    }

    if (user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedException(
        'Your account has been deactivated. Please contact support.',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Return user data (exclude sensitive fields)
    return {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          membershipType: user.membershipType,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          profilePicture: user.profilePicture,
          stellarWalletAddress: user.stellarWalletAddress,
        },
        tokens,
      },
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    // Security: Always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${email}`,
      );

      // Return success to prevent email enumeration
      return {
        success: true,
        message:
          'If an account exists with this email, you will receive password reset instructions.',
        data: {
          email,
          resetEmailSent: false,
        },
      };
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new BadRequestException(
        'Please verify your email before resetting password',
      );
    }

    // Generate password reset token
    const passwordResetToken = randomBytes(32).toString('hex');
    const passwordResetExpiry = new Date();
    passwordResetExpiry.setHours(passwordResetExpiry.getHours() + 1); // 1 hour expiry

    // Save token to user
    user.passwordResetToken = passwordResetToken;
    user.passwordResetExpiry = passwordResetExpiry;

    try {
      await this.userRepository.save(user);

      // Send password reset email
      const resetEmailSent = await this.emailService.sendPasswordResetEmail(
        email,
        user.fullName,
        passwordResetToken,
      );

      this.logger.log(`Password reset token generated for user: ${email}`);

      return {
        success: true,
        message: 'Password reset instructions have been sent to your email',
        data: {
          email,
          resetEmailSent,
        },
      };
    } catch (error) {
      this.logger.error(`Password reset error for ${email}:`, error);
      throw new InternalServerErrorException(
        'Failed to process password reset request. Please try again.',
      );
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    this.logger.log(
      `Password reset attempt with token: ${token.substring(0, 10)}...`,
    );

    // Find user with this token
    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user) {
      this.logger.warn(
        `Invalid password reset token: ${token.substring(0, 10)}...`,
      );
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token has expired
    const now = new Date();
    if (!user.passwordResetExpiry || user.passwordResetExpiry < now) {
      this.logger.warn(`Expired password reset token for user: ${user.email}`);
      throw new BadRequestException(
        'Reset token has expired. Please request a new one.',
      );
    }

    // Check if new password matches current password
    const isSameAsCurrentPassword = await bcrypt.compare(
      password,
      user.passwordHash,
    );
    if (isSameAsCurrentPassword) {
      throw new BadRequestException(
        'New password cannot be the same as your current password',
      );
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(password, saltRounds);

    // Update user
    user.passwordHash = newPasswordHash;
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;

    try {
      await this.userRepository.save(user);

      this.logger.log(`Password reset successful for user: ${user.email}`);

      // Optional: Send confirmation email
      this.emailService
        .sendPasswordChangeConfirmationEmail(user.email, user.fullName)
        .catch((err) => {
          this.logger.error(
            `Failed to send password change confirmation to ${user.email}:`,
            err,
          );
        });

      return {
        success: true,
        message: 'Password reset successful',
        data: {
          email: user.email,
          passwordChanged: true,
        },
      };
    } catch (error) {
      this.logger.error(`Password reset error for ${user.email}:`, error);
      throw new InternalServerErrorException(
        'Failed to reset password. Please try again.',
      );
    }
  }

  // Helper method to generate JWT tokens
  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Access token (short-lived)
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRATION') || '7d',
    });

    // Refresh token (long-lived)
    const refreshTokenExpiry = '30d';
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn:
        this.configService.get('JWT_REFRESH_EXPIRATION') || refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
