import { IsOptional, IsString } from 'class-validator';

export class CreateFileUploadDto {
  @IsOptional()
  @IsString()
  relatedType?: string;

  @IsOptional()
  @IsString()
  relatedId?: string;
}
