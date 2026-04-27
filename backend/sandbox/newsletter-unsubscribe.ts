import { Controller, Get, Query, BadRequestException, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import * as jwt from 'jsonwebtoken';

// Minimal subscriber shape
interface Subscriber { email: string; unsubscribed: boolean; }

const HTML_OK = `<!DOCTYPE html><html><body>
  <h2>You have been unsubscribed.</h2>
  <p>You will no longer receive newsletters from us.</p>
</body></html>`;

const HTML_ERR = `<!DOCTYPE html><html><body>
  <h2>Invalid or expired link.</h2>
  <p>Please request a new unsubscribe link.</p>
</body></html>`;

@Controller('sandbox/newsletter')
export class NewsletterUnsubscribeController {
  constructor(
    @InjectRepository('Subscriber')
    private readonly subRepo: Repository<Subscriber>,
  ) {}

  @Get('unsubscribe')
  async unsubscribe(@Query('token') token: string, @Res() res: Response) {
    if (!token) {
      return res.status(400).type('html').send(HTML_ERR);
    }

    let email: string;
    try {
      const secret = process.env.JWT_SECRET;
      const payload = jwt.verify(token, secret) as { email: string };
      email = payload.email;
    } catch {
      return res.status(400).type('html').send(HTML_ERR);
    }

    const subscriber = await this.subRepo.findOne({ where: { email } } as any);
    if (!subscriber) {
      return res.status(400).type('html').send(HTML_ERR);
    }

    subscriber.unsubscribed = true;
    await (this.subRepo as any).save(subscriber);

    return res.type('html').send(HTML_OK);
  }
}
