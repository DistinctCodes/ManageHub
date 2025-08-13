// src/lost-and-found/dto/create-lost-item.dto.ts
import { IsOptional, IsString, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateLostItemDto {
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  dateFound: Date;
}

// src/lost-and-found/dto/claim-lost-item.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class ClaimLostItemDto {
  @IsString()
  @IsNotEmpty()
  claimedBy: string;
}
