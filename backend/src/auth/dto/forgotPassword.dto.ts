import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address to send password reset instructions to',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail()
  email: string;
}
