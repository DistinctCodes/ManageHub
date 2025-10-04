import { IsOptional, IsString } from 'class-validator';

export class UpdateFileUploadDto {
  @IsOptional()
  @IsString()
  relatedType?: string;

  @IsOptional()
  @IsString()
  relatedId?: string;
}
