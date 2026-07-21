import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'email is required' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  @IsString()
  email: string;

  @IsNotEmpty({ message: 'otp is required' })
  @IsString()
  otp: string;
}
