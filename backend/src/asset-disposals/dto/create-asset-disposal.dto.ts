import { IsString, IsUUID, IsDateString } from 'class-validator';

export class CreateAssetDisposalDto {
  @IsUUID()
  assetId: string;

  @IsDateString()
  disposalDate: string;

  @IsString()
  method: string;

  @IsString()
  reason: string;

  @IsString()
  approvedBy: string;
}
