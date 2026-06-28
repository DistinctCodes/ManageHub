import { IsUUID } from 'class-validator';

export class AssignLockerDto {
  @IsUUID()
  userId: string;
}
