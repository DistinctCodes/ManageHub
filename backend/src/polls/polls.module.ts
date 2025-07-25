import { Module } from '@nestjs/common';
import { PollsService } from './polls.service';
import { PollsController } from './polls.controller';

// Note: All imports are runtime and should resolve after npm install
@Module({
  providers: [PollsService],
  controllers: [PollsController],
})
export class PollsModule {} 