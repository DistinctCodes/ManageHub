import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle, seconds } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { SubmitContactDto } from './dto/submit-contact.dto';
import { Public } from '../auth/decorators/public.decorator';

type AnyRequest = { ip?: string; headers?: Record<string, unknown> };

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Throttle({ contact: { ttl: seconds(60), limit: 5 } })
  @Post()
  async submit(@Body() dto: SubmitContactDto, @Req() req: AnyRequest) {
    const ip = this.getClientIp(req);
    return this.contactService.submit(dto, ip);
  }

  private getClientIp(req: AnyRequest): string | null {
    const xff = req.headers?.['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
    return req.ip ?? null;
  }
}
