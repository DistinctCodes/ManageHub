import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceVendorVisit } from './entities/service-vendor-visit.entity';
import { ServiceVendorVisitService } from './service-vendor-visit.service';
import { ServiceVendorVisitController } from './service-vendor-visit.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceVendorVisit])],
  controllers: [ServiceVendorVisitController],
  providers: [ServiceVendorVisitService],
  exports: [ServiceVendorVisitService], 
})
export class ServiceVendorVisitModule {}