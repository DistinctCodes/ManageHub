import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';

export class CreateInternetSpeedDto {
  @ApiProperty({ example: 'Lagos, Nigeria' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: 45.6 })
  @IsNumber()
  downloadSpeed: number;

  @ApiProperty({ example: 12.3 })
  @IsNumber()
  uploadSpeed: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  ping: number;
}