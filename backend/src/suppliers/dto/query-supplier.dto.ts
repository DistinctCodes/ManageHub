import { IsOptional, IsString, IsEmail } from 'class-validator';

export class QuerySupplierDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
