import { Controller, Post, Body } from '@nestjs/common';
import { AssetDisposalsService } from './asset-disposals.service';
import { CreateAssetDisposalDto } from './dto/create-asset-disposal.dto';
import { ApiTags, ApiCreatedResponse } from '@nestjs/swagger';

@ApiTags('asset-disposals')
@Controller('api/v1/asset-disposals')
export class AssetDisposalsController {
  constructor(private readonly service: AssetDisposalsService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Asset marked as disposed' })
  dispose(@Body() dto: CreateAssetDisposalDto) {
    return this.service.disposeAsset(dto);
  }
}
