import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { WorkspaceLog } from '../workspace-tracking/entities/workspace-log.entity';

interface ChecklistItem {
  label: string;
  completed: boolean;
}

interface OnboardingChecklist {
  items: ChecklistItem[];
  completionPercentage: number;
}

@Injectable()
export class OnboardingChecklistService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(WorkspaceLog)
    private readonly logRepo: Repository<WorkspaceLog>,
  ) {}

  async getChecklist(user: User): Promise<OnboardingChecklist> {
    const [firstBooking, firstCheckin] = await Promise.all([
      this.bookingRepo.findOne({ where: { user: { id: user.id } } }),
      this.logRepo.findOne({ where: { user: { id: user.id } } }),
    ]);

    const items: ChecklistItem[] = [
      {
        label: 'profileComplete',
        completed: !!(user.firstname && user.lastname && user.email && user.phone),
      },
      { label: 'firstBookingMade', completed: !!firstBooking },
      { label: 'firstCheckinDone', completed: !!firstCheckin },
      { label: 'emailVerified', completed: !!user.isVerified },
      { label: 'photoUploaded', completed: !!user.profilePicture },
    ];

    const completionPercentage = Math.round(
      (items.filter((i) => i.completed).length / items.length) * 100,
    );

    return { items, completionPercentage };
  }
}
