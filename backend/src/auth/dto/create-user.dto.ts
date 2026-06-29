import {
  IsString,
  MinLength,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @IsNotEmpty({ message: 'firstname can not be empty' })
  @IsString({ message: 'firstname must be a string' })
  @MaxLength(30)
  firstname: string;

  @IsNotEmpty({ message: 'lastname can not be empty' })
  @IsString({ message: 'lastname must be a string' })
  @MaxLength(30)
  lastname: string;

  @IsNotEmpty({ message: 'password can not be empty' })
  @MinLength(6, { message: 'password must be at least 6 character long' })
  password: string;

  /**
   * Optional referral code captured from the shareable URL
   * (e.g. /register?ref=MH-AAAA...) so the new user can be linked
   * to the referrer for downstream rewards tracking.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  referralCode?: string;
}
