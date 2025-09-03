import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  type: string;
}
