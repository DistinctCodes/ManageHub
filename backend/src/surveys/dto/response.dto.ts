import { IsString, IsUUID, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateResponseItemDto {
  @IsUUID()
  questionId: string;

  @IsNotEmpty()
  value: any;
}

export class CreateSurveyResponseDto {
  @IsUUID()
  surveyId: string;

  @IsString()
  respondentId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateResponseItemDto)
  responses: CreateResponseItemDto[];
}
