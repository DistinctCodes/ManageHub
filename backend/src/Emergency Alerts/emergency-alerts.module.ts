import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmergencyAlertsController } from "./emergency-alerts.controller";
import { EmergencyAlertsService } from "./emergency-alerts.service";
import { EmergencyAlert } from "./emergency-alert.entity";

@Module({
  imports: [TypeOrmModule.forFeature([EmergencyAlert])],
  controllers: [EmergencyAlertsController],
  providers: [EmergencyAlertsService],
  exports: [EmergencyAlertsService], // Export service for use in other modules if needed
})
export class EmergencyAlertsModule {}
