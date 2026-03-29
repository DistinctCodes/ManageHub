import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyTotpDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  tempToken: string;
}
