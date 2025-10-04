import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetAuditDto } from './create-asset-audit.dto';

export class UpdateAssetAuditDto extends PartialType(CreateAssetAuditDto) {}
