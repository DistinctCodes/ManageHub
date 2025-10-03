import { IsInt, IsString, IsOptional, Min } from 'class-validator';

export class RemoveStockDto {
  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  reason?: string;
}