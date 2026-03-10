import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  userId: string;

  @IsString()
  orderId: string;

  @IsString()
  paymentId: string;

  @IsDateString()
  issuedAt: Date;

  @IsOptional()
  @IsDateString()
  dueAt?: Date;

  @IsArray()
  items: Record<string, any>[];

  @IsNumber()
  subtotal: number;

  @IsNumber()
  tax: number;

  @IsNumber()
  total: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  notes?: string;
}