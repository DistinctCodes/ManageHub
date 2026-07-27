import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('join')
  joinWaitlist(
    @Body('workspaceId') workspaceId: string,
    @Body('userId') userId: string,
  ) {
    return this.waitlistService.queueMember(workspaceId, userId);
  }

  @Get(':workspaceId')
  getQueue(@Param('workspaceId') workspaceId: string) {
    return this.waitlistService.getQueue(workspaceId);
  }
}
