import { ApiProperty } from '@nestjs/swagger';
export class LogBookActionDto {
  @ApiProperty()
  bookId: string;

  @ApiProperty({ enum: BookAction })
  action: BookAction;

  @ApiProperty()
  userId: string;
}