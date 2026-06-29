import { IsUUID, IsInt, Min, Max, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RespondNpsDto {
  @ApiProperty({ description: 'Booking ID the survey is for' })
  @IsUUID()
  bookingId: string;

  @ApiProperty({ description: 'NPS score from 0 to 10', minimum: 0, maximum: 10 })
  @IsInt()
  @Min(0)
  @Max(10)
  score: number;

  @ApiPropertyOptional({ description: 'Optional feedback comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}
