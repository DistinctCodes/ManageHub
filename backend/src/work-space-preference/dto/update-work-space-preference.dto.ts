import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateWorkspacePreferenceDto } from './create-work-space-preference.dto';

export class UpdateWorkspacePreferenceDto extends PartialType(
  OmitType(CreateWorkspacePreferenceDto, ['userId', 'preferenceType'] as const),
) {}
