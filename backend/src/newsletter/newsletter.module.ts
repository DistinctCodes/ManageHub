import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { NewsletterSubscriber } from './entities/newsletter.entity';
import { NewsletterProvider } from './providers/subscription.provider';
import { ListNewsletterSubscribersProvider } from './providers/list-subscribers.provider';

@Module({
  imports: [TypeOrmModule.forFeature([NewsletterSubscriber])],
  controllers: [NewsletterController],
  providers: [
    NewsletterService,
    NewsletterProvider,
    ListNewsletterSubscribersProvider,
  ],
})
export class NewsletterModule {}
