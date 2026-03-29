import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class Disable2faDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
