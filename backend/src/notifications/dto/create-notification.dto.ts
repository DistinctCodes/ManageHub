import { NotificationType } from '../enums/notification-type.enum';

export class CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}
