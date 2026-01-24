import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscribeDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the subscriber',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Full name of the subscriber (optional)',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
