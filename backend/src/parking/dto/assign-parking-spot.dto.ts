import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignParkingSpotDto {
  @ApiProperty({ description: 'UUID of the user to assign this spot to' })
  @IsUUID()
  userId: string;
}