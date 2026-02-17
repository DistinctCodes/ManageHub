import { IsString, MinLength, IsNotEmpty, IsEmail, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @IsNotEmpty({ message: 'firstname can not be empty' })
  @IsString({ message: 'firstname must be a string' })
  @MaxLength(30)
  firstname: string;

  @IsNotEmpty({ message: 'lastname can not be empty' })
  @IsString({ message: 'lastname must be a string' })
  @MaxLength(30)
  lastname: string;

  @IsNotEmpty({ message: 'password can not be empty' })
  @MinLength(6, { message: 'password must be at least 6 character long' })
  password: string;
}
