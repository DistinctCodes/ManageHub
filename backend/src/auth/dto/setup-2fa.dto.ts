import { IsString, Length } from 'class-validator';

export class Setup2faDto {
  @IsString()
  @Length(6, 6)
  token: string;
}
