import { IsUUID } from 'class-validator';

export class AssignInventoryItemDto {
  @IsUUID()
  userId: string;
}
