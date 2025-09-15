import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { CreateFAQDto } from './create-faq.dto';

export class UpdateFAQDto extends PartialType(CreateFAQDto) {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  updatedBy?: string;
}
