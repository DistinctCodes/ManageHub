import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import {
  IsNotCommonPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './password-policy';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'correct horse battery staple' })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  // bcrypt ignores bytes past 72, so an unbounded "long" password would
  // collide with any other password sharing its 72-byte prefix (issue #1954).
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message:
      'password must be at most 72 characters (longer values are truncated ' +
      'by the hash function and would collide with shorter ones)',
  })
  @IsNotCommonPassword()
  password: string;
}
