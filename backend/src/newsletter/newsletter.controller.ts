import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { ConvertKitService } from './services/convertkit.service';
import { SubscribeDto } from './dto/subscribe.dto';

@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  private readonly logger = new Logger(NewsletterController.name);

  constructor(private readonly convertKitService: ConvertKitService) {}

  @Public()
  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Subscribe to newsletter',
    description: 'Subscribe a user to the newsletter using ConvertKit API',
  })
  @ApiBody({ type: SubscribeDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully subscribed to newsletter',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Successfully subscribed to newsletter!' },
        data: {
          type: 'object',
          properties: {
            email: { type: 'string', example: 'john.doe@example.com' },
            subscribed_at: { type: 'string', example: '2024-01-01T12:00:00Z' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email or bad request',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Please provide a valid email address' },
        error: { type: 'string', example: 'BAD_REQUEST' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already subscribed or duplicate subscription',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'This email is already subscribed' },
        error: { type: 'string', example: 'CONFLICT' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Internal server error occurred' },
        error: { type: 'string', example: 'INTERNAL_SERVER_ERROR' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - ConvertKit API error',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Newsletter service is temporarily unavailable' },
        error: { type: 'string', example: 'SERVICE_UNAVAILABLE' },
      },
    },
  })
  async subscribe(@Body() subscribeDto: SubscribeDto) {
    try {
      this.logger.log(`Newsletter subscription request for: ${subscribeDto.email}`);

      const result = await this.convertKitService.subscribeToNewsletter(
        subscribeDto.email,
        subscribeDto.name,
      );

      this.logger.log(`Newsletter subscription successful for: ${subscribeDto.email}`);

      return {
        success: true,
        message: 'Successfully subscribed to newsletter!',
        data: {
          email: subscribeDto.email,
          subscribed_at: result.subscription.created_at,
          subscriber_id: result.subscription.subscriber.id,
        },
      };
    } catch (error) {
      this.logger.error(
        `Newsletter subscription failed for ${subscribeDto.email}:`,
        error.message,
      );

      // Return structured error response
      return {
        success: false,
        message: error.message || 'Subscription failed',
        error: this.getErrorCode(error.status),
      };
    }
  }

  private getErrorCode(httpStatus: number): string {
    switch (httpStatus) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      case HttpStatus.INTERNAL_SERVER_ERROR:
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}