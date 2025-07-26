import { IsUUID } from 'class-validator';
export class SyncRequestDto {
  @IsUUID()
  biometricDataId: string;
} 