import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';
import { MovementType } from '../entities/inventory-movement.entity';

export class CreateInventoryMovementDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty({ enum: MovementType })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNotEmpty()
  initiatedBy: string;
}
