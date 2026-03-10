import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
} from '@nestjs/common';

import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
  ) {}

  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.createInvoice(dto);
  }

  @Get()
  getInvoices(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query() filter: FilterInvoiceDto,
  ) {
    return this.invoicesService.getInvoices(
      Number(page),
      Number(limit),
      filter,
    );
  }

  @Get(':id')
  getInvoice(@Param('id') id: string) {
    return this.invoicesService.getInvoice(id);
  }

  @Get(':id/download')
  downloadInvoice(@Param('id') id: string) {
    return this.invoicesService.downloadInvoice(id);
  }

  @Post(':id/send')
  sendInvoice(@Param('id') id: string) {
    return this.invoicesService.sendInvoice(id);
  }

  @Post(':id/void')
  voidInvoice(@Param('id') id: string) {
    return this.invoicesService.voidInvoice(id);
  }
}