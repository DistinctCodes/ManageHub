import { Module } from '@nestjs/common';
import { InternetSpeedController } from './internet-speed.controller';
import { InternetSpeedService } from './internet-speed.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternetSpeedResult } from './entities/internet-speed.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InternetSpeedResult])],
  controllers: [InternetSpeedController],
  providers: [InternetSpeedService]
})
export class InternetSpeedModule {}
