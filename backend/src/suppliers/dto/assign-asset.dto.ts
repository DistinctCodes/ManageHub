import { IsInt } from 'class-validator';

export class AssignAssetDto {
  @IsInt()
  supplierId: number;

  @IsInt()
  assetId: number;
}
