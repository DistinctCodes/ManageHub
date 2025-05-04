import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [AuthModule, UploadsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
