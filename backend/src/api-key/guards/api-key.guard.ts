import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from '../api-key.service';
import { API_KEY_ENDPOINTS_KEY } from '../decorators/api-key-endpoints.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const apiKey = this.extractApiKey(request);
    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    const startTime = Date.now();
    const validKey = await this.apiKeyService.validateApiKey(apiKey);
    
    if (!validKey) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Check endpoint restrictions
    const allowedEndpoints = this.reflector.get<string[]>(
      API_KEY_ENDPOINTS_KEY,
      context.getHandler(),
    );

    if (allowedEndpoints && validKey.allowedEndpoints?.length > 0) {
      const currentEndpoint = request.route?.path || request.url;
      const hasAccess = validKey.allowedEndpoints.some(endpoint =>
        currentEndpoint.includes(endpoint) || allowedEndpoints.includes(endpoint)
      );

      if (!hasAccess) {
        throw new UnauthorizedException('Access denied for this endpoint');
      }
    }

    // Attach API key info to request
    request.apiKey = validKey;

    // Track usage after response
    response.on('finish', async () => {
      try {
        await this.apiKeyService.trackUsage(
          validKey,
          request.route?.path || request.url,
          request.method,
          response.statusCode,
          request.get('user-agent'),
          request.ip,
          Date.now() - startTime,
        );
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to track API usage:', error);
      }
    });

    return true;
  }

  private extractApiKey(request: any): string | null {
    // Check Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Check query parameter
    return request.query?.api_key || null;
  }
}
