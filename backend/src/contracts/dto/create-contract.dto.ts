import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateContractDto {
  @IsUUID()
  memberId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  bodyHtml: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
