// backend/src/auth/dto/verify-email.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Verification token is required' })
  token: string;
}
