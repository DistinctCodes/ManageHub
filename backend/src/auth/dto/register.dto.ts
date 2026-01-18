// backend/src/auth/dto/register.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MembershipType } from '../entities/user.entity';

export class RegisterDto {
  @IsString()
  @MinLength(3, { message: 'Full name must be at least 3 characters' })
  @MaxLength(100, { message: 'Full name is too long' })
  @Matches(/^[a-zA-Z\s]+$/, {
    message: 'Full name can only contain letters and spaces',
  })
  fullName: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @IsString()
  @Matches(/^(\+234|0)[789][01]\d{8}$/, {
    message: 'Invalid Nigerian phone number',
  })
  @Transform(({ value }) => {
    // Normalize to international format
    if (value.startsWith('0')) {
      return '+234' + value.slice(1);
    }
    return value;
  })
  phone: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password is too long' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/[0-9]/, {
    message: 'Password must contain at least one number',
  })
  @Matches(/[@$!%*?&#]/, {
    message: 'Password must contain at least one special character',
  })
  password: string;

  @IsEnum(MembershipType, { message: 'Invalid membership type' })
  membershipType: MembershipType;
}
