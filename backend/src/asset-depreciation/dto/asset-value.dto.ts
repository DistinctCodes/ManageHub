import { IsString, IsNumber } from 'class-validator';

export class AssetValueDto {
  @IsString()
  assetId: string;

  @IsNumber()
  currentValue: number;
}