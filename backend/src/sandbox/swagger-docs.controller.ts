import { Controller, Get, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('sandbox/docs')
@ApiBearerAuth()
@Controller('sandbox/docs')
export class SwaggerDocsController {
  @Get('endpoints')
  @ApiOperation({ summary: 'List all sandbox endpoint groups' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a summary of all sandbox endpoint groups.',
    schema: {
      example: {
        groups: [
          { tag: 'sandbox/waitlist', description: 'Waitlist management' },
          { tag: 'sandbox/bookings', description: 'Bulk booking operations' },
          { tag: 'sandbox/analytics', description: 'Occupancy analytics' },
          { tag: 'sandbox/reports', description: 'Booking CSV reports' },
          { tag: 'sandbox/streak', description: 'User check-in streaks' },
        ],
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden.' })
  getEndpointGroups() {
    return {
      groups: [
        { tag: 'sandbox/waitlist', description: 'Waitlist management' },
        { tag: 'sandbox/bookings', description: 'Bulk booking operations' },
        { tag: 'sandbox/analytics', description: 'Occupancy analytics' },
        { tag: 'sandbox/reports', description: 'Booking CSV reports' },
        { tag: 'sandbox/streak', description: 'User check-in streaks' },
      ],
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Sandbox API health check' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sandbox API is healthy.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized.' })
  health() {
    return { status: 'ok', module: 'sandbox' };
  }
}
