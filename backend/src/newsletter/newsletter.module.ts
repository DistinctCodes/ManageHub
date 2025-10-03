import { Module } from '@nestjs/common';
import { NewsletterController } from './newsletter.controller';
import { ConvertKitService } from './services/convertkit.service';

@Module({
  controllers: [NewsletterController],
  providers: [ConvertKitService],
  exports: [ConvertKitService],
})
export class NewsletterModule {}