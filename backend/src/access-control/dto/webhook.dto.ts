import { IsNotEmpty, IsString } from 'class-validator';

export class WebhookDto {
  @IsString()
  @IsNotEmpty()
  deviceIdentifier: string;

  @IsString()
  @IsNotEmpty()
  memberToken: string;
}
