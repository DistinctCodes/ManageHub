// @ts-nocheck
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JobsObservabilityService } from './jobs-observability.service';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('Admin - Job Observability')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/jobs')
export class JobsObservabilityController {
  constructor(private readonly observability: JobsObservabilityService) {}

  @Get('queues')
  @ApiOperation({ summary: 'List all queues with stats' })
  async getAllQueues() {
    const stats = await this.observability.getAllQueueStats();
    return { message: 'Queues retrieved successfully', data: stats };
  }

  @Get('queues/:name')
  @ApiOperation({ summary: 'Get stats for a specific queue' })
  async getQueueStats(@Param('name') name: string) {
    const stats = await this.observability.getQueueStats(name);
    return { message: 'Queue stats retrieved successfully', data: stats };
  }

  @Get('queues/:name/failed')
  @ApiOperation({ summary: 'Get failed jobs for a queue' })
  @ApiQuery({ name: 'limit', required: false })
  async getFailedJobs(
    @Param('name') name: string,
    @Query('limit') limit?: string,
  ) {
    const jobs = await this.observability.getFailedJobs(
      name,
      limit ? parseInt(limit, 10) : 50,
    );
    return { message: 'Failed jobs retrieved successfully', data: jobs };
  }

  @Post('queues/:name/retry/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually retry a failed job' })
  async retryJob(
    @Param('name') name: string,
    @Param('jobId') jobId: string,
  ) {
    const job = await this.observability.retryJob(name, jobId);
    return { message: `Job ${jobId} queued for retry`, data: { id: job.id } };
  }

  @Post('queues/:name/purge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purge dead-letter jobs from a queue' })
  async purgeDeadLetter(@Param('name') name: string) {
    const result = await this.observability.purgeDeadLetterQueue(name);
    return {
      message: `Purged ${result.purged} dead-letter job(s)`,
      data: result,
    };
  }
}
