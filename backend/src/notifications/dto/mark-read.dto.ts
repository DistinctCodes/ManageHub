import { IsUUID } from 'class-validator';

export class MarkReadDto {
  @IsUUID()
  id: string;
}
