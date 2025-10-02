import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dto/createUser.dto';
import { ErrorCatch } from '../../utils/error';
import { HashingProvider } from 'src/auth/providers/hashing.provider';
import { AuthResponse } from 'src/auth/interfaces/authResponse.interface';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { GenerateTokensProvider } from 'src/auth/providers/generateTokens.provider';
import { RefreshTokenRepositoryOperations } from 'src/auth/providers/RefreshTokenCrud.repository';
import { UserRole } from '../enums/userRoles.enum';
import { EmailService } from '../../email/providers/email.service';
@Injectable()
export class CreateUserProvider {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

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
      const hashedPassword = await this.hashingProvider.hash(createUserDto.password);
      createUserDto.password = hashedPassword;

      // Set default role if not provided
      if (!createUserDto.role) {
        createUserDto.role = UserRole.USER;
      }

      // Create and save the user (or admin)
      let user = this.userRepository.create(createUserDto);
      user = await this.userRepository.save(user);

      // Generate tokens
      const { accessToken, refreshToken } =
        await this.generateTokensProvider.generateBothTokens(user);

      await this.refreshTokenRepositoryOperations.saveRefreshToken(user, refreshToken);

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

      // Send registration confirmation email
      try {
        const emailSent = await this.emailService.sendRegistrationConfirmation(
          user.email,
          `${user.firstname} ${user.lastname}`
        );
        
        if (!emailSent) {
          // Log the error but don't fail the registration
          console.warn(`Failed to send registration confirmation email to ${user.email}. User registration was successful.`);
        } else {
          console.log(`Registration confirmation email sent successfully to ${user.email}`);
        }
      } catch (emailError) {
        // Log the error but don't fail the registration
        console.error(`Error sending registration confirmation email to ${user.email}:`, emailError.message);
        console.log('User registration was successful despite email failure.');
      }

      return { user, accessToken };
    } catch (error) {
      ErrorCatch(error, 'Failed to create user');
    }
  }
}
