// ...existing code...
// ...existing code...
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../file-uploads/multer.provider';
import { FileUploadsService } from '../file-uploads/file-uploads.service';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';

@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly fileUploadsService: FileUploadsService,
  ) {}

  @Post()
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @Get()
  findAll(@Query() query: QuerySupplierDto) {
    return this.suppliersService.findAll(query);
  }
  @Post('assign-asset')
  assignAsset(@Body() assignAssetDto: AssignAssetDto) {
    return this.suppliersService.assignAsset(
      assignAssetDto.supplierId,
      assignAssetDto.assetId,
    );
  }

  @Post('unassign-asset')
  unassignAsset(@Body() assignAssetDto: AssignAssetDto) {
    return this.suppliersService.unassignAsset(
      assignAssetDto.supplierId,
      assignAssetDto.assetId,
    );
  }

  @Post(':id/uploads')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadForSupplier(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // create a file upload record and link to this supplier
    const dto = { relatedType: 'supplier', relatedId: id };
    return this.fileUploadsService.create(file, dto as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(+id, updateSupplierDto);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string) {
    return this.suppliersService.toggleStatus(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(+id);
  }
}
