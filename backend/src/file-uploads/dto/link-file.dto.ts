import { IsString, IsUUID, IsOptional } from 'class-validator';

export class LinkFileDto {
  @IsOptional()
  @IsString()
  relatedType?: string;

  @IsOptional()
  @IsUUID()
  relatedId?: string;
}
