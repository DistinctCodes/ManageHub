import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import {
  IsNotCommonPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './password-policy';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(32)
  token: string;

  @ApiProperty({ example: 'a new correct horse battery staple' })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @IsNotCommonPassword()
  newPassword: string;
}