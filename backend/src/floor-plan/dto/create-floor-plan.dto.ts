import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFloorPlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNumber()
  canvasWidth?: number;

  @IsOptional()
  @IsNumber()
  canvasHeight?: number;

  @IsOptional()
  @IsString()
  backgroundImageUrl?: string;
}
