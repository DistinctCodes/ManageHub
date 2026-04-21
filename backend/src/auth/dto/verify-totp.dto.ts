import { IsString } from 'class-validator';

export class VerifyTotpDto {
  @IsString()
  token: string;

  @IsString()
  tempToken: string;
}
