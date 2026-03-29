import { IsNotEmpty, IsString } from 'class-validator';

export class Setup2faDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
