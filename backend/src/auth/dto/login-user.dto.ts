import { MinLength, IsNotEmpty, IsEmail } from 'class-validator';

export class LoginUserDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @IsNotEmpty({ message: 'password can not be empty' })
  @MinLength(8, { message: 'password must be at least 8 character long' })
  password: string;
}
