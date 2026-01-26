import { IsString, MinLength, IsNotEmpty, IsEmail } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @IsNotEmpty({ message: 'fullName can not be empty' })
  @IsString({ message: 'fullName must be a string' })
  fullName: string;

  @IsNotEmpty({ message: 'password can not be empty' })
  @MinLength(6, { message: 'password must be at least 6 character long' })
  password: string;
}
