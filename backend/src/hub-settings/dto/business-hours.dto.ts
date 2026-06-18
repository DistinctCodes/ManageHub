import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DayHoursDto {
  @ApiPropertyOptional({ example: '08:00' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'open must be in HH:mm format' })
  open?: string;

  @ApiPropertyOptional({ example: '20:00' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'close must be in HH:mm format' })
  close?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isOpen?: boolean;
}
