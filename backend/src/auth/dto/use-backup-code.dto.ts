import { IsNotEmpty, IsString } from 'class-validator';

export class UseBackupCodeDto {
  @IsString()
  @IsNotEmpty()
  backupCode: string;

  @IsString()
  @IsNotEmpty()
  tempToken: string;
}
