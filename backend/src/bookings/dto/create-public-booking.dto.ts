import { IsString, IsEmail, IsUUID, IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePublicBookingDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  guestName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  guestEmail: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  guestPhone: string;

  @ApiProperty()
  @IsUUID()
  workspaceId: string;

  @ApiProperty({ example: '2026-06-22' })
  @IsDateString()
  date: string;
}
