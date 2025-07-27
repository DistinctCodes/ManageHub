import { IsString, IsEnum, IsInt, IsNotEmpty } from 'class-validator';
export class CreateBiometricDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsEnum(['fingerprint', 'face', 'voice'])
  biometricType: 'fingerprint' | 'face' | 'voice';

  @IsInt()
  dataQuality: number;

  @IsString()
  payload: string;
} 