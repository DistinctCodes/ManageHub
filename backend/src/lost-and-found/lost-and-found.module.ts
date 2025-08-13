// src/lost-and-found/lost-and-found.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LostItem } from './entities/lost-item.entity';
import { LostAndFoundService } from './lost-and-found.service';
import { LostAndFoundController } from './lost-and-found.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LostItem])],
  controllers: [LostAndFoundController],
  providers: [LostAndFoundService],
})
export class LostAndFoundModule {}
