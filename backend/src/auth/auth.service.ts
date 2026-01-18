// backend/src/auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, UserStatus } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
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
}
