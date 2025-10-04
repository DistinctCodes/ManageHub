import { IsOptional, IsBooleanString, IsNumberString } from 'class-validator';

export class GetAlertsQueryDto {
  @IsOptional()
  @IsBooleanString()
  resolved?: string; // 'true' | 'false'

  @IsOptional()
  @IsNumberString()
  skip?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  itemId?: string;
}
