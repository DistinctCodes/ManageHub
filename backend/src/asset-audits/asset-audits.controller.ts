import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AssetAuditsService } from './asset-audits.service';
import { CreateAssetAuditDto } from './dto/create-asset-audit.dto';
import { UpdateAssetAuditDto } from './dto/update-asset-audit.dto';

@Controller('asset-audits')
export class AssetAuditsController {
  constructor(private readonly assetAuditsService: AssetAuditsService) {}

  @Post()
  create(@Body() createAssetAuditDto: CreateAssetAuditDto) {
    return this.assetAuditsService.create(createAssetAuditDto);
  }

  @Get()
  findAll() {
    return this.assetAuditsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetAuditsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAssetAuditDto: UpdateAssetAuditDto) {
    return this.assetAuditsService.update(id, updateAssetAuditDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetAuditsService.remove(id);
  }

  @Get('report/audited-vs-missing')
  getAuditedVsMissingReport() {
    return this.assetAuditsService.getAuditedVsMissingReport();
  }
}
