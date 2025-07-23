import { Module } from '@nestjs/common';
import { BadgesService } from './badges.service';
import { BadgesController } from './badges.controller';

@Module({
  providers: [BadgesService],
  controllers: [BadgesController],
})
export class BadgesModule {} 