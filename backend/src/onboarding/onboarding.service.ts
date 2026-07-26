import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';

export interface OnboardingStep {
  key: string;
  label: string;
  done: boolean;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  percentComplete: number;
  dismissed: boolean;
}

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
  ) {}

  async getStatus(userId: string): Promise<OnboardingStatus> {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    const bookingCount = await this.bookings.count({ where: { userId } });

    const steps: OnboardingStep[] = [
      { key: 'verified_email', label: 'Verify your email', done: !!user.emailVerified },
      { key: 'completed_profile', label: 'Complete your profile', done: this.profileComplete(user) },
      { key: 'first_booking', label: 'Make your first booking', done: bookingCount > 0 },
    ];

    const done = steps.filter(s => s.done).length;
    return {
      steps,
      percentComplete: Math.round((done / steps.length) * 100),
      dismissed: !!user.onboardingDismissedAt,
    };
  }

  async dismiss(userId: string): Promise<void> {
    await this.users.update(userId, { onboardingDismissedAt: new Date() } as Partial<User>);
  }

  private profileComplete(user: User): boolean {
    const fields = [user.firstName, user.lastName, user.email, (user as Record<string,unknown>)['phone']];
    const filled = fields.filter(Boolean).length;
    return filled / fields.length >= 0.8;
  }
}