import {
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

// ── Create Thread ─────────────────────────────────────────────────────────

export class CreateThreadDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one participant is required' })
  @IsUUID('4', { each: true })
  participantIds: string[];
}

// ── Send Message ──────────────────────────────────────────────────────────

export class SendMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Message body cannot be empty' })
  body: string;
}

// ── Paginate Messages ─────────────────────────────────────────────────────

export class MessagePaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}