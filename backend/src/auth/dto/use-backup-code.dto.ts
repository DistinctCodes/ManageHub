import { IsString } from 'class-validator';

export class UseBackupCodeDto {
  @IsString()
  backupCode: string;

  @IsString()
  tempToken: string;
}
