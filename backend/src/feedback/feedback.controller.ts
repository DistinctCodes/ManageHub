import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, seconds } from '@nestjs/throttler';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { FeedbackType } from './enums/feedback-type.enum';
import { FeedbackStatus } from './enums/feedback-status.enum';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { RolesGuard } from '../auth/guard/roles.guard';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { User } from '../users/entities/user.entity';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Public()
  @Throttle({ feedback: { ttl: seconds(60), limit: 10 } })
  @Post()
  async submit(
    @Body() dto: CreateFeedbackDto,
    @CurrentUser() user?: User,
  ) {
    // If user is authenticated, associate their ID
    const feedbackDto: CreateFeedbackDto = {
      ...dto,
      userId: user?.id || dto.userId,
    };
    const feedback = await this.feedbackService.create(feedbackDto);
    return {
      message: 'Feedback submitted successfully',
      data: {
        id: feedback.id,
        type: feedback.type,
        subject: feedback.subject,
        status: feedback.status,
        createdAt: feedback.createdAt,
      },
    };
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: FeedbackType,
    @Query('status') status?: FeedbackStatus,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.feedbackService.findAll(pageNum, limitNum, type, status);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get('stats')
  async getStats() {
    return this.feedbackService.getStats();
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.feedbackService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    const feedback = await this.feedbackService.updateStatus(id, dto);
    return {
      message: 'Feedback status updated successfully',
      data: {
        id: feedback.id,
        status: feedback.status,
        adminNote: feedback.adminNote,
        updatedAt: feedback.updatedAt,
      },
    };
  }
}
