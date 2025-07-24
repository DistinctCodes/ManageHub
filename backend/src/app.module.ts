import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BadgesModule } from './badges/badges.module';
import { InternetSpeedModule } from './internet-speed/internet-speed.module';

@Module({
  imports: [BadgesModule, InternetSpeedModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
