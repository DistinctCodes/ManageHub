import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Locker } from './entities/locker.entity';
import { LockersService } from './lockers.service';
import { LockersController } from './lockers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Locker])],
  controllers: [LockersController],
  providers: [LockersService],
  exports: [LockersService],
})
export class LockersModule {}
