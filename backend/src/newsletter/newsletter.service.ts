import { Injectable } from '@nestjs/common';
import { NewsletterProvider } from './providers/subscription.provider';
import { PaginationQueryDto } from '../config/pagination/dto/pagination-query.dto';
import { ListNewsletterSubscribersProvider } from './providers/list-subscribers.provider';

@Injectable()
export class NewsletterService {
  constructor(
    private readonly subscriptionProvider: NewsletterProvider,
    private readonly listSubscribersProvider: ListNewsletterSubscribersProvider,
  ) {}

  subscribe(email: string, ipAddress?: string | null) {
    return this.subscriptionProvider.subscribe({ email, ipAddress });
  }

  unsubscribe(token: string) {
    return this.subscriptionProvider.unsubscribe({ token });
  }

  confirm(token: string) {
    return this.subscriptionProvider.confirm({ token });
  }

  listSubscribers(query: PaginationQueryDto) {
    return this.listSubscribersProvider.execute(query);
  }
}
