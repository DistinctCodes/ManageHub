import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ContactDto {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// In-memory rate limit store: ip -> submission timestamps
const rateLimitStore = new Map<string, number[]>();

@Injectable()
export class ContactService {
  constructor(private readonly config: ConfigService) {}

  async submit(dto: ContactDto, ip: string): Promise<{ success: boolean }> {
    this.validatePayload(dto);
    this.checkRateLimit(ip);

    const adminEmail = this.config.get<string>('ADMIN_EMAIL');

    await this.sendEmail({
      to: adminEmail,
      subject: `Contact Form: ${dto.subject}`,
      body: `From: ${dto.name} <${dto.email}>\n\n${dto.message}`,
    });

    await this.sendEmail({
      to: dto.email,
      subject: 'We received your message',
      body: `Hi ${dto.name},\n\nThanks for reaching out. We'll get back to you shortly.\n\nYour message:\n${dto.message}`,
    });

    return { success: true };
  }

  private validatePayload(dto: ContactDto) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) throw new BadRequestException('Invalid email');
    if (!dto.name || !dto.subject) throw new BadRequestException('name and subject are required');
    if (dto.message?.length > 1000) throw new BadRequestException('message exceeds 1000 chars');
  }

  private checkRateLimit(ip: string) {
    const now = Date.now();
    const window = 60 * 60 * 1000; // 1 hour
    const timestamps = (rateLimitStore.get(ip) ?? []).filter(t => now - t < window);
    if (timestamps.length >= 3) throw new BadRequestException('Rate limit exceeded');
    rateLimitStore.set(ip, [...timestamps, now]);
  }

  // Placeholder — wire up Nodemailer / SendGrid in real usage
  private async sendEmail(_opts: { to: string; subject: string; body: string }) {
    return Promise.resolve();
  }
}
