import { SetMetadata } from '@nestjs/common';

export const API_KEY_ENDPOINTS_KEY = 'apiKeyEndpoints';
export const ApiKeyEndpoints = (...endpoints: string[]) => 
  SetMetadata(API_KEY_ENDPOINTS_KEY, endpoints);