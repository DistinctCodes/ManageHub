import { IsString, IsEmail, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  firstname: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  lastname: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  username?: string;

  @IsEmail()
  @MaxLength(50)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(80)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_.])[A-Za-z\d@$!%*?&\-_.]+$/, {
    message: 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&-_.).',
  })
  password: string;
}
