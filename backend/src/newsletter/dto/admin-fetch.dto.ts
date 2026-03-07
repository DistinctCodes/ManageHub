import { NewsletterSubscriber } from '../entities/newsletter.entity';

export class NewsletterSubscriberAdminDto {
  id: string;
  email: string;
  subscribedAt: Date;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(s: NewsletterSubscriber): NewsletterSubscriberAdminDto {
    return {
      id: s.id,
      email: s.email,
      subscribedAt: s.subscribedAt,
      isActive: s.isActive,
      isVerified: s.isVerified,
      verifiedAt: s.verifiedAt ?? null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}
