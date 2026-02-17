import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsletterSubscriber } from '../entities/newsletter.entity';
import { randomBytes } from 'crypto';
import { EmailService } from '../../email/email.service';

@Injectable()
export class NewsletterProvider {
  constructor(
    @InjectRepository(NewsletterSubscriber)
    private readonly repo: Repository<NewsletterSubscriber>,
    private readonly emailService: EmailService,
  ) {}

  async subscribe(params: { email: string; ipAddress?: string | null }) {
    const email = params.email.trim().toLowerCase();
    const fullName = this.safeNameFromEmail(email);

    if (this.isDisposableEmail(email)) {
      throw new BadRequestException(
        'Disposable email addresses are not allowed.',
      );
    }

    const existing = await this.repo.findOne({
      where: { email },
      withDeleted: true,
    });

    // Already verified+active: block re-subscribe
    if (
      existing &&
      existing.isActive &&
      existing.isVerified &&
      !existing.deletedAt
    ) {
      throw new ConflictException('Email is already subscribed.');
    }

    const now = new Date();
    const verificationToken = this.makeToken();
    const unsubscribeToken = this.makeToken();

    // Reuse record if it exists (revive as pending)
    const subscriber = existing ?? this.repo.create({ email });

    subscriber.subscribedAt = now;
    subscriber.consentedAt = now;
    subscriber.ipAddress = params.ipAddress ?? undefined;

    // Pending state
    subscriber.isVerified = false;
    subscriber.verifiedAt = null;
    subscriber.isActive = false;

    subscriber.verificationToken = verificationToken;
    subscriber.unsubscribeToken = unsubscribeToken;

    // If it was soft-deleted before, revive it (so unique email won't conflict)
    subscriber.deletedAt = null;
    subscriber.verificationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );

    try {
      const saved = await this.repo.save(subscriber);

      const confirmUrl = this.buildFrontendUrl(
        `/newsletter/confirm?token=${encodeURIComponent(verificationToken)}`,
      );
      await this.emailService.sendTemplateEmail(
        email,
        'Confirm your newsletter subscription',
        'newsletter-confirmation',
        {
          fullName: fullName ?? 'there',
          confirmUrl,
          expiresIn: '24 hours',
          appName: 'ManageHub',
          year: String(new Date().getFullYear()),
        },
      );

      // Return shape should match frontend types; token should NOT be returned
      return this.toResponse(saved);
    } catch (e: any) {
      if (e?.code === '23505') {
        throw new ConflictException('Email is already subscribed.');
      }
      throw e;
    }
  }

  private makeToken(): string {
    return randomBytes(32).toString('hex'); // 64 chars
  }

  private isDisposableEmail(email: string): boolean {
    const domain = email.split('@')[1] ?? '';
    const block = new Set([
      'mailinator.com',
      'tempmail.com',
      '10minutemail.com',
    ]);
    return block.has(domain.toLowerCase());
  }

  private toResponse(s: NewsletterSubscriber) {
    return {
      id: s.id,
      email: s.email,
      subscribedAt: s.subscribedAt,
      isActive: s.isActive,
    };
  }

  async unsubscribe(params: { token: string }) {
    const token = params.token.trim();

    // Find by token, including soft-deleted rows (so repeated unsub is idempotent)
    const subscriber = await this.repo.findOne({
      where: { unsubscribeToken: token },
      withDeleted: true,
    });

    // Option A (strict): throw if token is invalid
    if (!subscriber) {
      throw new NotFoundException('Invalid unsubscribe token.');
    }

    // Idempotency: if already unsubscribed, return success anyway
    if (!subscriber.isActive || subscriber.deletedAt) {
      return {
        success: true,
        message: 'You are already unsubscribed.',
      };
    }

    subscriber.isActive = false;

    // Soft delete the record while keeping history
    await this.repo.softRemove(subscriber);

    const fullName = this.safeNameFromEmail(subscriber.email);
    await this.emailService.sendTemplateEmail(
      subscriber.email,
      'You have been unsubscribed',
      'newsletter-unsubscribed',
      {
        fullName: fullName ?? 'there',
        appName: 'ManageHub',
        year: String(new Date().getFullYear()),
      },
    );

    return {
      success: true,
      message: 'Unsubscribed successfully.',
    };
  }

  async confirm(params: { token: string }) {
    const token = params.token.trim();
    const urlBase = process.env.FRONTEND_URL;

    const subscriber = await this.repo.findOne({
      where: { verificationToken: token },
      withDeleted: true,
    });

    if (!subscriber) {
      throw new NotFoundException('Invalid confirmation token.');
    }

    if (
      subscriber.verificationTokenExpiresAt &&
      subscriber.verificationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Confirmation link has expired.');
    }

    // If soft-deleted, treat as invalid (they unsubscribed or were removed)
    if (subscriber.deletedAt) {
      throw new BadRequestException('Subscription is no longer available.');
    }

    // Idempotent confirm
    if (subscriber.isVerified && subscriber.isActive) {
      return { success: true, message: 'Subscription already confirmed.' };
    }

    subscriber.isVerified = true;
    subscriber.isActive = true;
    subscriber.verifiedAt = new Date();
    subscriber.verificationToken = null;
    subscriber.verificationTokenExpiresAt = null;

    await this.repo.save(subscriber);

    const fullName = this.safeNameFromEmail(subscriber.email);
    const unsubscribeUrl = this.buildFrontendUrl(
      `/newsletter/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribeToken)}`,
    );
    await this.emailService.sendTemplateEmail(
      subscriber.email,
      'Subscription confirmed',
      'newsletter-confirmed',
      {
        fullName: fullName ?? 'there',
        email: subscriber.email,
        dashboardUrl: this.buildFrontendUrl('/'),
        unsubscribeUrl,
        appName: 'ManageHub',
        year: String(new Date().getFullYear()),
      },
    );

    return { success: true, message: 'Subscription confirmed successfully.' };
  }

  private buildFrontendUrl(path: string): string {
    const base = (process.env.FRONTEND_URL ?? '').trim().replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  }

  private safeNameFromEmail(email: string): string {
    const raw = (email.split('@')[0] ?? 'there').trim();
    // keep it friendly & safe for templates
    const cleaned = raw.replace(/[^a-zA-Z0-9._\-\s]/g, '').slice(0, 40);
    return cleaned.length ? cleaned : 'there';
  }
}
