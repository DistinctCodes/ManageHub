// create-work-log.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsBoolean } from "class-validator";

export class CreateWorkLogDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  completed?: boolean;
}
