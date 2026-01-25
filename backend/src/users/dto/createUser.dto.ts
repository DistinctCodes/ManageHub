import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../enums/userRoles.enum'; // import your enum

export class CreateUserDto {
  @ApiProperty({ minLength: 1, maxLength: 30 })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  firstname: string;

  @ApiProperty({ minLength: 1, maxLength: 30 })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  lastname: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 20 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  username?: string;

  @ApiProperty({ maxLength: 50, example: 'jane.doe@example.com' })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(50)
  email: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 80,
    description: 'Must include lower, upper, number, and special (@$!%*?&-_.).',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_.])[A-Za-z\d@$!%*?&\-_.]+$/,
    {
      message:
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&-_.).',
    },
  )
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
