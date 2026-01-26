import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendPasswordResetOtpDto {
  @IsNotEmpty({ message: 'email is required' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;
}
