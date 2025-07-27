import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
} from "@nestjs/common";
import { EmergencyAlertsService } from "./emergency-alerts.service";
import { CreateAlertDto } from "./create-alert.dto";
import { UpdateAlertDto } from "./update-alert.dto";
import { AlertQueryDto } from "./alert-query.dto";
import { EmergencyAlert } from "./emergency-alert.entity";

@Controller("emergency-alerts")
export class EmergencyAlertsController {
  constructor(private readonly alertsService: EmergencyAlertsService) {}

  @Post()
  async createAlert(
    @Body(ValidationPipe) createAlertDto: CreateAlertDto
  ): Promise<{
    statusCode: number;
    message: string;
    data: EmergencyAlert;
  }> {
    const alert = await this.alertsService.createAlert(createAlertDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: "Emergency alert created successfully",
      data: alert,
    };
  }

  @Get("active")
  async getActiveAlerts(
    @Query(ValidationPipe) queryDto: AlertQueryDto
  ): Promise<{
    statusCode: number;
    message: string;
    data: {
      alerts: EmergencyAlert[];
      total: number;
      pagination: {
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    };
  }> {
    const result = await this.alertsService.getActiveAlerts(queryDto);

    return {
      statusCode: HttpStatus.OK,
      message: "Active alerts retrieved successfully",
      data: {
        ...result,
        pagination: {
          limit: queryDto.limit || 20,
          offset: queryDto.offset || 0,
          hasMore:
            (queryDto.offset || 0) + (queryDto.limit || 20) < result.total,
        },
      },
    };
  }

  @Get("history")
  async getAlertHistory(): Promise<{
    statusCode: number;
    message: string;
    data: EmergencyAlert[];
  }> {
    const history = await this.alertsService.getAlertHistory();

    return {
      statusCode: HttpStatus.OK,
      message: "Alert history retrieved successfully",
      data: history,
    };
  }

  @Get("stats")
  async getAlertStats(): Promise<{
    statusCode: number;
    message: string;
    data: any;
  }> {
    const stats = await this.alertsService.getAlertStats();

    return {
      statusCode: HttpStatus.OK,
      message: "Alert statistics retrieved successfully",
      data: stats,
    };
  }

  @Get(":id")
  async getAlertById(@Param("id", ParseUUIDPipe) id: string): Promise<{
    statusCode: number;
    message: string;
    data: EmergencyAlert;
  }> {
    const alert = await this.alertsService.getAlertById(id);

    return {
      statusCode: HttpStatus.OK,
      message: "Alert retrieved successfully",
      data: alert,
    };
  }

  @Get()
  async getAllAlerts(@Query(ValidationPipe) queryDto: AlertQueryDto): Promise<{
    statusCode: number;
    message: string;
    data: {
      alerts: EmergencyAlert[];
      total: number;
      pagination: {
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    };
  }> {
    const result = await this.alertsService.getAllAlerts(queryDto);

    return {
      statusCode: HttpStatus.OK,
      message: "All alerts retrieved successfully",
      data: {
        ...result,
        pagination: {
          limit: queryDto.limit || 20,
          offset: queryDto.offset || 0,
          hasMore:
            (queryDto.offset || 0) + (queryDto.limit || 20) < result.total,
        },
      },
    };
  }

  @Put(":id")
  async updateAlert(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateAlertDto: UpdateAlertDto
  ): Promise<{
    statusCode: number;
    message: string;
    data: EmergencyAlert;
  }> {
    const alert = await this.alertsService.updateAlert(id, updateAlertDto);

    return {
      statusCode: HttpStatus.OK,
      message: "Alert updated successfully",
      data: alert,
    };
  }

  @Put(":id/resolve")
  async resolveAlert(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { resolvedBy?: string } = {}
  ): Promise<{
    statusCode: number;
    message: string;
    data: EmergencyAlert;
  }> {
    const alert = await this.alertsService.resolveAlert(id, body.resolvedBy);

    return {
      statusCode: HttpStatus.OK,
      message: "Alert resolved successfully",
      data: alert,
    };
  }
}
