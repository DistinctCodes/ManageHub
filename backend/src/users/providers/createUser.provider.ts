import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dto/createUser.dto';
import { ErrorCatch } from '../../utils/error';
import { HashingProvider } from '../../auth/providers/hashing.provider';
import { AuthResponse } from '../../auth/interface/authResponse.interface';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { GenerateTokensProvider } from '../../auth/providers/generateTokens.provider';
import { RefreshTokenRepositoryOperations } from '../../auth/providers/refreshToken.repository';
import { UserRole } from '../enums/userRoles.enum';
import { EmailService } from '../../email/email.service';
import { Referral } from '../../referrals/entities/referral.entity';
import { ReferralStatus } from '../../referrals/enums/referral-status.enum';
import * as crypto from 'crypto';

@Injectable()
export class CreateUserProvider {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,

    private readonly hashingProvider: HashingProvider,

    private readonly configService: ConfigService,

    private readonly generateTokensProvider: GenerateTokensProvider,

    private readonly refreshTokenRepositoryOperations: RefreshTokenRepositoryOperations,

    private readonly emailService: EmailService,
  ) {}

  public async createUser(
    createUserDto: CreateUserDto,
    response: Response,
  ): Promise<AuthResponse> {
    try {
      const existingUser = await this.userRepository.findOne({
        where: { email: createUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User already exists.');
      }

      // Hash the password
      const hashedPassword = await this.hashingProvider.hash(
        createUserDto.password,
      );
      createUserDto.password = hashedPassword;

      // Set default role if not provided
      if (!createUserDto.role) {
        createUserDto.role = UserRole.USER;
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date();
      verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24);

      // Extract referredByCode before spreading to avoid polluting entity
      const { referredByCode, ...userFields } = createUserDto;

      // Generate unique referral code for the new user
      const referralCode = await this.generateUniqueReferralCode();

      // Create and save the user
      let user = this.userRepository.create({
        ...userFields,
        referralCode,
        isVerified: false,
        verificationToken,
        verificationTokenExpiry,
      });
      user = await this.userRepository.save(user);

      // If a referral code was supplied, create a pending Referral record
      if (referredByCode) {
        const referrer = await this.userRepository.findOne({
          where: { referralCode: referredByCode },
        });
        if (referrer && referrer.id !== user.id) {
          const referral = this.referralRepository.create({
            referrerId: referrer.id,
            referredUserId: user.id,
            code: referredByCode,
            status: ReferralStatus.PENDING,
          });
          await this.referralRepository.save(referral).catch(() => void 0);
        }
      }

      // Generate tokens
      const { accessToken, refreshToken } =
        await this.generateTokensProvider.generateBothTokens(user);

      await this.refreshTokenRepositoryOperations.saveRefreshToken(
        user,
        refreshToken,
      );

      const jwtExpirationMs = parseInt(
        this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '604800000',
      );
      const expires = new Date(Date.now() + jwtExpirationMs);

      response.cookie('authRefreshToken', refreshToken, {
        secure: true,
        httpOnly: true,
        expires,
        path: '/auth/refresh-token',
        sameSite: 'none',
      });

      // Send verification email
      try {
        const emailSent = await this.emailService.sendVerificationLinkEmail(
          user.email,
          verificationToken,
          `${user.firstname} ${user.lastname}`,
        );

        if (!emailSent) {
          console.warn(
            `Failed to send verification email to ${user.email}. User registration was successful.`,
          );
        }
      } catch (emailError) {
        console.error(
          `Error sending verification email to ${user.email}:`,
          emailError.message,
        );
      }

      return { user, accessToken };
    } catch (error) {
      ErrorCatch(error, 'Failed to create user');
    }
  }

  private async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = `MH-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const existing = await this.userRepository.findOne({
        where: { referralCode: code },
      });
      if (!existing) return code;
    }
    // Fallback: use more entropy to virtually guarantee uniqueness
    return `MH-${crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 8)}`;
  }
}
