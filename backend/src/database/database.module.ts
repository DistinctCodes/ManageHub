import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BiometricDataEntity } from '../biometric/biometric.entity';
import { SyncLogEntity } from '../logging/log.entity';
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'sqlite',
        database: 'biometric-sim.db',
        entities: [BiometricDataEntity, SyncLogEntity],
        synchronize: true,
      }),
    }),
  ],
})
export class DatabaseModule {} 