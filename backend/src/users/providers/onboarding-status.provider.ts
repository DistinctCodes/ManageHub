import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { NotificationType } from '../../notifications/enums/notification-type.enum';

export interface OnboardingStep {
  key: string;
  label: string;
  completed: boolean;
  href: string;
}

export interface OnboardingStatus {
  completionPercent: number;
  steps: OnboardingStep[];
}

@Injectable()
export class OnboardingStatusProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,

    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async getStatus(userId: string): Promise<OnboardingStatus> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    // Count bookings made by this user
    const bookingCount = await this.bookingsRepository.count({
      where: { userId },
    });

    // Check if a notification preferences record exists for this user.
    // The project uses the Notification entity for user notification history;
    // the issue references "NotificationPreferences" from BE-58 which tracks
    // whether the user has configured their preferences. We approximate this
    // by checking whether the user has at least one notification record,
    // which is set when preferences are saved by the notifications module.
    const notificationCount = await this.notificationsRepository.count({
      where: {
        userId,
        type: NotificationType.GENERAL,
      },
    });

    const steps: OnboardingStep[] = [
      {
        key: 'profile_photo',
        label: 'Add a profile photo',
        completed: !!user?.profilePicture,
        href: '/settings',
      },
      {
        key: 'phone_verified',
        label: 'Verify your phone number',
        // User entity has `phone` but not a separate `isPhoneVerified` flag yet;
        // treat having a phone number on file as the verified signal until
        // the BE-58 verification field is added.
        completed: !!user?.phone,
        href: '/settings',
      },
      {
        key: 'first_booking',
        label: 'Make your first booking',
        completed: bookingCount > 0,
        href: '/workspaces',
      },
      {
        key: 'notifications_set',
        label: 'Set notification preferences',
        completed: notificationCount > 0,
        href: '/settings/notifications',
      },
    ];

    const completedCount = steps.filter((s) => s.completed).length;
    const completionPercent = Math.round(
      (completedCount / steps.length) * 100,
    );

    return { completionPercent, steps };
  }
}