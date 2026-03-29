import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckInDto {
  @ApiProperty({ description: 'Workspace to check into' })
  @IsUUID()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Associated booking ID (optional)' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
