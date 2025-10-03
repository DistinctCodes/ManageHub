import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AssetDepreciationService } from './providers/asset-depreciation.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { Asset } from './entities/asset.entity';

@ApiTags('assets')
@Controller('assets')
export class AssetDepreciationController {
  constructor(
    private readonly assetDepreciationService: AssetDepreciationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create asset' })
  @ApiResponse({ status: 201, description: 'Asset created successfully.' })
  async create(@Body() createAssetDto: CreateAssetDto) {
    const asset = await this.assetDepreciationService.create(createAssetDto);
    return {
      success: true,
      message: 'Asset created successfully',
      data: asset,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all assets' })
  @ApiResponse({ status: 200, description: 'Assets retrieved successfully.' })
  async findAll() {
    const assets = await this.assetDepreciationService.findAll();
    return {
      success: true,
      message: 'Assets retrieved successfully',
      data: assets,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiResponse({ status: 200, description: 'Asset retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Asset not found.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const asset = await this.assetDepreciationService.findOne(id);
    return {
      success: true,
      message: 'Asset retrieved successfully',
      data: asset,
    };
  }

  @Get(':id/value')
  @ApiOperation({ summary: 'Get current depreciated value of asset' })
  @ApiResponse({ status: 200, description: 'Current asset value retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Asset not found.' })
  async getCurrentValue(@Param('id', ParseUUIDPipe) id: string) {
    const currentValue = await this.assetDepreciationService.getCurrentValue(id);
    return {
      success: true,
      message: 'Current asset value retrieved successfully',
      data: {
        assetId: id,
        currentValue: currentValue,
      },
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update asset' })
  @ApiResponse({ status: 200, description: 'Asset updated successfully.' })
  @ApiResponse({ status: 404, description: 'Asset not found.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAssetDto: UpdateAssetDto,
  ) {
    const asset = await this.assetDepreciationService.update(id, updateAssetDto);
    return {
      success: true,
      message: 'Asset updated successfully',
      data: asset,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete asset' })
  @ApiResponse({ status: 204, description: 'Asset deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Asset not found.' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.assetDepreciationService.remove(id);
    return {
      success: true,
      message: 'Asset deleted successfully',
    };
  }
}