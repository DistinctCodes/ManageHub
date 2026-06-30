import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, seconds } from '@nestjs/throttler';
import { CreditsService } from './credits.service';
import { PurchaseCreditsDto } from './dto/purchase-credits.dto';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';

@ApiTags('Credits')
@ApiBearerAuth()
@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('packs')
  @ApiOperation({ summary: 'List active credit packs' })
  async getPacks() {
    const data = await this.creditsService.getCreditPacks();
    return { message: 'Credit packs retrieved successfully', data };
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Purchase a credit pack' })
  @Throttle({ medium: { ttl: seconds(60), limit: 10 } })
  async purchase(
    @Body() dto: PurchaseCreditsDto,
    @GetCurrentUser('id') userId: string,
  ) {
    const data = await this.creditsService.purchase(dto.creditPackId, userId);
    return { message: 'Credit purchase initiated', data };
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get remaining credit hours' })
  async getBalance(@GetCurrentUser('id') userId: string) {
    const data = await this.creditsService.getBalance(userId);
    return { message: 'Credit balance retrieved successfully', data };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get paginated credit transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHistory(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @GetCurrentUser('id') userId: string,
  ) {
    const data = await this.creditsService.getHistory(userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return { message: 'Credit history retrieved successfully', ...data };
  }
}
