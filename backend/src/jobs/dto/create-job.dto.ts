import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  requirements: string;

  @IsUrl()
  @IsNotEmpty()
  applicationLink: string;
}
