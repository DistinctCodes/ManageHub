import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class CreateInternalNoteDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsInt()
  userId: number;
}
