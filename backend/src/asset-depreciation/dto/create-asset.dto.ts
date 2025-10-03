import { IsString, IsNumber, IsDate, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { DepreciationMethod } from '../entities/asset.entity';

export class CreateAssetDto {
  @IsString()
  name: string;

  @IsNumber()
  purchasePrice: number;

  @IsNumber()
  salvageValue: number;

  @IsNumber()
  usefulLifeYears: number;

  @IsEnum(DepreciationMethod)
  @IsOptional()
  depreciationMethod?: DepreciationMethod;

  @IsDate()
  @Type(() => Date)
  purchaseDate: Date;
}