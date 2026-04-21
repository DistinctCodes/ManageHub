import { IsString } from 'class-validator';

export class Disable2faDto {
  @IsString()
  password: string;
}
