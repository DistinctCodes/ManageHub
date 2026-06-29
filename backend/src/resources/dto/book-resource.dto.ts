import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class BookResourceDto {
  @IsDateString() startTime: string;
  @IsDateString() endTime: string;
  @IsInt() @Min(1) @IsOptional() quantityRequested?: number;
}
