import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Asset } from '../assets/entities/asset.entity';


@Module({
imports: [TypeOrmModule.forFeature([Asset])],
providers: [DashboardService],
controllers: [DashboardController],
exports: [DashboardService],
})
export class DashboardModule {}