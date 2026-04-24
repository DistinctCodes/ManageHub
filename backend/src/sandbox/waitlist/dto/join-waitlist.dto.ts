import { IsUUID, IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinWaitlistDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({ example: '2024-06-15' })
  @IsDateString()
  @IsNotEmpty()
  requestedDate: string;
}
