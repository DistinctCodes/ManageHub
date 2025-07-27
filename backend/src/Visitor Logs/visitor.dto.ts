import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";

export class CreateVisitorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  visitReason: string;

  @IsDateString()
  @Transform(({ value }) => value || new Date().toISOString())
  entryTime: string;
}

export class UpdateVisitorDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  visitReason?: string;

  @IsOptional()
  @IsDateString()
  entryTime?: string;

  @IsOptional()
  @IsDateString()
  exitTime?: string;
}

export class SearchVisitorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
