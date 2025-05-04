import { IsNotEmpty, IsEnum, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsUUID()
  recipientId: string;

  @IsNotEmpty()
  message: string;

  @IsNotEmpty()
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean = true;

  @IsOptional()
  @IsBoolean()
  sendRealtime?: boolean = true;
}