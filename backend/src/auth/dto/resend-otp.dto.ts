import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendOtpDto {
  @IsNotEmpty({ message: 'email is required' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;
}
