import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePackageDto {
  @IsUUID()
  recipientUserId: string;

  @IsString()
  @IsNotEmpty()
  courierName: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsDateString()
  arrivedAt?: string;
}
