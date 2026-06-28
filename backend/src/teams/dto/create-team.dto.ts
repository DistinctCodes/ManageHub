import { IsString, IsEmail, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  seatLimit?: number;

  @ApiProperty({ example: 'billing@acme.com' })
  @IsEmail()
  billingEmail: string;
}
