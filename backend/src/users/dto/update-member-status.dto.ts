import { IsEnum } from 'class-validator';
import { MembershipStatus } from '../enums/membership-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberStatusDto {
  @ApiProperty({ enum: MembershipStatus })
  @IsEnum(MembershipStatus)
  status: MembershipStatus;
}
