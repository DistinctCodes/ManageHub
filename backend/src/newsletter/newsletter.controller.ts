import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, seconds } from '@nestjs/throttler';
import { NewsletterService } from './newsletter.service';
import {
  ConfirmNewsletterDto,
  SubscribeNewsletterDto,
  UnsubscribeNewsletterDto,
} from './dto/subscription.dto';
import { PaginationQueryDto } from '../config/pagination/dto/pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Public } from '../auth/decorators/public.decorator';

type AnyRequest = { ip?: string; headers?: Record<string, unknown> };

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly service: NewsletterService) {}

  @Public()
  @Throttle({ newsletter: { ttl: seconds(60), limit: 5 } })
  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeNewsletterDto, @Req() req: AnyRequest) {
    const ip = this.getClientIp(req);
    const data = await this.service.subscribe(dto.email, ip);

    return {
      success: true,
      message: 'Subscribed successfully.',
      data,
    };
  }

  @Public()
  @Throttle({ newsletter: { ttl: seconds(60), limit: 20 } })
  @Post('confirm')
  async confirm(@Body() dto: ConfirmNewsletterDto) {
    return this.service.confirm(dto.token);
  }

  @Public()
  @Throttle({ newsletter: { ttl: seconds(60), limit: 20 } })
  @Post('unsubscribe')
  async unsubscribe(@Body() dto: UnsubscribeNewsletterDto) {
    return this.service.unsubscribe(dto.token);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('subscribers')
  async listSubscribers(@Query() query: PaginationQueryDto) {
    return this.service.listSubscribers(query);
  }

  private getClientIp(req: AnyRequest): string | null {
    const xff = req.headers?.['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
    return req.ip ?? null;
  }
}
