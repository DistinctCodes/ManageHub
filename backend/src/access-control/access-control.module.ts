import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AccessControlService } from './access-control.service';
import { AccessControlController } from './access-control.controller';
import { AccessDevice } from './entities/access-device.entity';
import { AccessLog } from './entities/access-log.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccessDevice, AccessLog, Booking]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AccessControlController],
  providers: [AccessControlService],
})
export class AccessControlModule {}
