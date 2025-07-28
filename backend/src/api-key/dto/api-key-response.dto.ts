import { ApiKeyStatus } from '../api-key.entity';

export class ApiKeyResponseDto {
  id: string;
  appName: string;
  status: ApiKeyStatus;
  allowedEndpoints: string[];
  dailyLimit: number;
  currentDayUsage: number;
  totalUsage: number;
  contactEmail: string;
  description: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class CreateApiKeyResponseDto extends ApiKeyResponseDto {
  apiKey: string; // Only returned on creation
}
