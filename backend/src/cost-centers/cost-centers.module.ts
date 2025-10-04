import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CostCentersService } from './cost-centers.service';
import { CostCentersController } from './cost-centers.controller';
import { CostCenter } from './entities/cost-center.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CostCenter])],
  controllers: [CostCentersController],
  providers: [CostCentersService],
  exports: [CostCentersService], // Export service for use in other modules
})
export class CostCentersModule {}