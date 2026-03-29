import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateMemberStatusDto {
  @ApiProperty({
    enum: ['suspend', 'activate', 'promote', 'demote'],
  })
  @IsIn(['suspend', 'activate', 'promote', 'demote'])
  action: 'suspend' | 'activate' | 'promote' | 'demote';
}
