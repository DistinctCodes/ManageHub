import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditsController } from './audits.controller';
import { AuditsService } from './audits.service';
import { Audit } from './entities/audit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Audit])],
  controllers: [AuditsController],
  providers: [AuditsService],
  exports: [AuditsService],
})
export class AuditsModule {}