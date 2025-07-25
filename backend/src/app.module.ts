import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BadgesModule } from './badges/badges.module';
import { PollsModule } from './polls/polls.module';

@Module({
  imports: [BadgesModule, PollsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
