import { IsInt, IsString, IsOptional, Min } from 'class-validator';

export class UpdateStockDto {
  @IsInt()
  @Min(0)
  quantity: number;

  @IsString()
  @IsOptional()
  reason?: string;
}