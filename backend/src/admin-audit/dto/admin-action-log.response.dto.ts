import { ApiProperty } from '@nestjs/swagger';
import { AdminActionLog } from '../admin-action-log.entity';
import { AdminActionType } from '../admin-action-type.enum';

export class AdminActionLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  actorId: string;

  @ApiProperty({ enum: AdminActionType })
  action: AdminActionType;

  @ApiProperty()
  targetType: string;

  @ApiProperty({ nullable: true })
  targetId: string | null;

  @ApiProperty({ nullable: true })
  detail: string | null;

  @ApiProperty({ nullable: true, description: "Caller's IP address" })
  ip: string | null;

  @ApiProperty({ nullable: true, description: "Caller's User-Agent" })
  userAgent: string | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(log: AdminActionLog): AdminActionLogResponseDto {
    const dto = new AdminActionLogResponseDto();
    dto.id = log.id;
    dto.actorId = log.actorId;
    dto.action = log.action as AdminActionType;
    dto.targetType = log.targetType;
    dto.targetId = log.targetId;
    dto.detail = log.detail;
    dto.ip = log.ip ?? null;
    dto.userAgent = log.userAgent ?? null;
    dto.createdAt = log.createdAt;
    return dto;
  }
}
