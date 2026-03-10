import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { InvoiceStatus } from '../enums/invoice-status.enum';

export class FilterInvoiceDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;
}