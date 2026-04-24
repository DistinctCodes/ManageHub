import { IsUUID, IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OccupancyRateQueryDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({ example: '2024-03-31' })
  @IsDateString()
  @IsNotEmpty()
  to: string;
}
