import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ 
    description: 'Email verification token',
    example: 'abc123def456...',
    minLength: 10,
    maxLength: 255
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(255)
  token: string;
}