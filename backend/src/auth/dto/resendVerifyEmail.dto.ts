import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerifyEmailDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(50)
  email: string;
}
