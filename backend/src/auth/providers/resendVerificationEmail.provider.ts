// ManageHub/backend/src/auth/providers/resendVerificationEmail.provider.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
// import { EmailService } from '../../email/providers/email.service';
import { ErrorCatch } from '../../utils/error';
import * as crypto from 'crypto';

@Injectable()
export class ResendVerificationEmailProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    // private readonly emailService: EmailService,
  ) {}

  public async resendVerificationEmail(
    email: string,
  ): Promise<{ message: string }> {
    try {
      // Find user by email
      const user = await this.usersRepository.findOne({
        where: { email },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user is already verified
      if (user.isVerified) {
        throw new BadRequestException('Email is already verified');
      }

      // Check rate limiting (5 minutes cooldown)
      if (user.lastVerificationEmailSent) {
        const timeSinceLastEmail =
          new Date().getTime() - user.lastVerificationEmailSent.getTime();
        const cooldownPeriod = 5 * 60 * 1000; // 5 minutes in milliseconds

        if (timeSinceLastEmail < cooldownPeriod) {
          const remainingTime = Math.ceil(
            (cooldownPeriod - timeSinceLastEmail) / 1000 / 60,
          );
          throw new HttpException(
            `Please wait ${remainingTime} minute(s) before requesting another verification email`,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date();
      verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // 24 hours expiry

      // Update user with new token and timestamp
      await this.usersRepository.update(user.id, {
        verificationToken,
        verificationTokenExpiry,
        lastVerificationEmailSent: new Date(),
      });

      // Send verification email
      // const emailSent = await this.emailService.sendVerificationEmail(
      //   user.email,
      //   verificationToken,
      //   `${user.firstname} ${user.lastname}`,
      // );

      // if (!emailSent) {
      //   throw new BadRequestException('Failed to send verification email');
      // }

      return { message: 'Verification email sent successfully' };
    } catch (error) {
      ErrorCatch(error, 'Failed to resend verification email');
    }
  }
}
