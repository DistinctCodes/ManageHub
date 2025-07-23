import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BadgesModule } from './badges/badges.module';

@Module({
  imports: [BadgesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
