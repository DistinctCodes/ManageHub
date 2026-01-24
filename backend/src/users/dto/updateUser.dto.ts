// src/users/dto/updateUser.dto.ts
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { UserRole } from '../enums/userRoles.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  firstname?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  lastname?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  username?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(50)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_.])[A-Za-z\d@$!%*?&\-_.]+$/,
    {
      message:
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&-_.).',
    },
  )
  password?: string;

  @IsOptional()
  role?: UserRole;

  @IsOptional()
  @IsString()
  verificationToken?: string;

  @IsOptional()
  verificationTokenExpiry?: Date;

  @IsOptional()
  @IsString()
  passwordResetToken?: string;

  @IsOptional()
  passwordResetExpiresIn?: Date;

  @IsOptional()
  lastPasswordResetSentAt?: Date;

  @IsOptional()
  lastVerificationEmailSent?: Date;

  @IsOptional()
  isVerified?: boolean;

  @IsOptional()
  isActive?: boolean;
}
