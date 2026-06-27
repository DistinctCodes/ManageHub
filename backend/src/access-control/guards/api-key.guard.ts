import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-device-key'];
    const expected = this.configService.get<string>('DEVICE_WEBHOOK_API_KEY');

    if (!expected || apiKey !== expected) {
      throw new UnauthorizedException('Invalid or missing X-Device-Key');
    }

    return true;
  }
}
