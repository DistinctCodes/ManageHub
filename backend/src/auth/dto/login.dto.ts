// backend/src/auth/dto/login.dto.ts
import { IsEmail, IsString, IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @IsString()
  password: string;
}
