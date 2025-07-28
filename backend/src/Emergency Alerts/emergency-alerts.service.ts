import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsWhere, MoreThan } from "typeorm";
import { EmergencyAlert, AlertStatus } from "./emergency-alert.entity";
import { CreateAlertDto } from "./create-alert.dto";
import { UpdateAlertDto } from "./update-alert.dto";
import { AlertQueryDto } from "./alert-query.dto";

@Injectable()
export class EmergencyAlertsService {
  constructor(
    @InjectRepository(EmergencyAlert)
    private alertsRepository: Repository<EmergencyAlert>
  ) {}

  async createAlert(createAlertDto: CreateAlertDto): Promise<EmergencyAlert> {
    const alert = this.alertsRepository.create({
      ...createAlertDto,
      expiresAt: createAlertDto.expiresAt
        ? new Date(createAlertDto.expiresAt)
        : null,
    });

    return await this.alertsRepository.save(alert);
  }

  async getActiveAlerts(queryDto: AlertQueryDto = {}): Promise<{
    alerts: EmergencyAlert[];
    total: number;
  }> {
    const where: FindOptionsWhere<EmergencyAlert> = {
      status: AlertStatus.ACTIVE,
    };

    if (queryDto.severity) {
      where.severity = queryDto.severity;
    }

    if (queryDto.category) {
      where.category = queryDto.category;
    }

    // Check for expired alerts and update them
    await this.updateExpiredAlerts();

    const [alerts, total] = await this.alertsRepository.findAndCount({
      where,
      order: { createdAt: "DESC" },
      take: queryDto.limit,
      skip: queryDto.offset,
    });

    return { alerts, total };
  }

  async getAllAlerts(queryDto: AlertQueryDto = {}): Promise<{
    alerts: EmergencyAlert[];
    total: number;
  }> {
    const where: FindOptionsWhere<EmergencyAlert> = {};

    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.severity) {
      where.severity = queryDto.severity;
    }

    if (queryDto.category) {
      where.category = queryDto.category;
    }

    const [alerts, total] = await this.alertsRepository.findAndCount({
      where,
      order: { createdAt: "DESC" },
      take: queryDto.limit,
      skip: queryDto.offset,
    });

    return { alerts, total };
  }

  async getAlertById(id: string): Promise<EmergencyAlert> {
    const alert = await this.alertsRepository.findOne({ where: { id } });

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${id} not found`);
    }

    return alert;
  }

  async updateAlert(
    id: string,
    updateAlertDto: UpdateAlertDto
  ): Promise<EmergencyAlert> {
    const alert = await this.getAlertById(id);

    if (updateAlertDto.status === AlertStatus.RESOLVED && !alert.resolvedAt) {
      updateAlertDto.resolvedBy = updateAlertDto.resolvedBy || "system";
      alert.resolvedAt = new Date();
    }

    if (updateAlertDto.expiresAt) {
      alert.expiresAt = new Date(updateAlertDto.expiresAt);
    }

    Object.assign(alert, updateAlertDto);

    return await this.alertsRepository.save(alert);
  }

  async resolveAlert(id: string, resolvedBy?: string): Promise<EmergencyAlert> {
    return await this.updateAlert(id, {
      status: AlertStatus.RESOLVED,
      resolvedBy: resolvedBy || "system",
    });
  }

  async getAlertHistory(): Promise<EmergencyAlert[]> {
    return await this.alertsRepository.find({
      where: [
        { status: AlertStatus.RESOLVED },
        { status: AlertStatus.EXPIRED },
      ],
      order: { updatedAt: "DESC" },
    });
  }

  async getAlertStats(): Promise<{
    total: number;
    active: number;
    resolved: number;
    expired: number;
    bySeverity: Record<string, number>;
  }> {
    const total = await this.alertsRepository.count();
    const active = await this.alertsRepository.count({
      where: { status: AlertStatus.ACTIVE },
    });
    const resolved = await this.alertsRepository.count({
      where: { status: AlertStatus.RESOLVED },
    });
    const expired = await this.alertsRepository.count({
      where: { status: AlertStatus.EXPIRED },
    });

    const severityStats = await this.alertsRepository
      .createQueryBuilder("alert")
      .select("alert.severity", "severity")
      .addSelect("COUNT(*)", "count")
      .where("alert.status = :status", { status: AlertStatus.ACTIVE })
      .groupBy("alert.severity")
      .getRawMany();

    const bySeverity = severityStats.reduce((acc, stat) => {
      acc[stat.severity] = parseInt(stat.count);
      return acc;
    }, {});

    return {
      total,
      active,
      resolved,
      expired,
      bySeverity,
    };
  }

  private async updateExpiredAlerts(): Promise<void> {
    await this.alertsRepository
      .createQueryBuilder()
      .update(EmergencyAlert)
      .set({ status: AlertStatus.EXPIRED })
      .where("status = :status", { status: AlertStatus.ACTIVE })
      .andWhere("expiresAt IS NOT NULL")
      .andWhere("expiresAt < :now", { now: new Date() })
      .execute();
  }
}
