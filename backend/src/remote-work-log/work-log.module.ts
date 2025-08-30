import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WorkLog } from "./entities/work-log.entity";
import { WorkLogService } from "./work-log.service";
import { WorkLogController } from "./work-log.controller";

@Module({
  imports: [TypeOrmModule.forFeature([WorkLog])],
  controllers: [WorkLogController],
  providers: [WorkLogService],
  exports: [WorkLogService],
})
export class WorkLogModule {}
