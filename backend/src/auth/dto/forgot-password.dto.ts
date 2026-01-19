// backend/src/auth/dto/forgot-password.dto.ts
import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @Transform(({ value }) => value.toLowerCase())
  email: string;
}
