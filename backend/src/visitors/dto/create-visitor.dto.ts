import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsUUID,
  IsDateString,
} from 'class-validator';

export class CreateVisitorDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsUUID()
  @IsNotEmpty()
  hostMemberId: string;

  @IsString()
  @IsNotEmpty()
  purpose: string;

  @IsDateString()
  @IsNotEmpty()
  expectedDate: string;
}
