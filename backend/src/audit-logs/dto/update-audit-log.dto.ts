import { PartialType } from '@nestjs/swagger';
import { CreateAuditLogDto } from './create-audit-log.dto';

export class UpdateAuditLogDto extends PartialType(CreateAuditLogDto) {}
