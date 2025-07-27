import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EnergyConsumption } from '../entities/energy-consumption.entity';
import { CreateEnergyConsumptionDto } from '../dto/create-energy-consumption.dto';
import { QueryEnergyDto } from '../dto/query-energy.dto';
import { EnergySummaryDto } from '../dto/energy-summary.dto';

@Injectable()
export class EnergyConsumptionService {
  private readonly logger = new Logger(EnergyConsumptionService.name);
  private readonly mockWorkspaces = [
    { id: 'ws-001', name: 'Development Floor' },
    { id: 'ws-002', name: 'Marketing Department' },
    { id: 'ws-003', name: 'Executive Offices' },
    { id: 'ws-004', name: 'Server Room' },
    { id: 'ws-005', name: 'Conference Rooms' },
  ];

  constructor(
    @InjectRepository(EnergyConsumption)
    private readonly energyRepository: Repository<EnergyConsumption>,
  ) {}

  async create(dto: CreateEnergyConsumptionDto): Promise<EnergyConsumption> {
    const consumption = this.energyRepository.create({
      ...dto,
      date: new Date(dto.date),
    });

    return await this.energyRepository.save(consumption);
  }

  async findAll(query: QueryEnergyDto): Promise<{
    data: EnergyConsumption[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { workspaceId, startDate, endDate, limit = 100, offset = 0 } = query;
    const queryBuilder = this.energyRepository.createQueryBuilder('energy');

    if (workspaceId) {
      queryBuilder.andWhere('energy.workspaceId = :workspaceId', { workspaceId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('energy.date BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    } else if (startDate) {
      queryBuilder.andWhere('energy.date >= :startDate', {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      queryBuilder.andWhere('energy.date <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const [data, total] = await queryBuilder
      .orderBy('energy.date', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return {
      data,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  }

  async findByWorkspaceAndDate(workspaceId: string, date: string): Promise<EnergyConsumption> {
    const consumption = await this.energyRepository.findOne({
      where: {
        workspaceId,
        date: new Date(date),
      },
    });

    if (!consumption) {
      throw new NotFoundException(
        `Energy consumption not found for workspace ${workspaceId} on ${date}`,
      );
    }

    return consumption;
  }

  async getSummary(workspaceId?: string): Promise<EnergySummaryDto[]> {
    const queryBuilder = this.energyRepository.createQueryBuilder('energy');

    if (workspaceId) {
      queryBuilder.where('energy.workspaceId = :workspaceId', { workspaceId });
    }

    const consumptions = await queryBuilder
      .orderBy('energy.workspaceId')
      .addOrderBy('energy.date', 'DESC')
      .getMany();

    const workspaceGroups = consumptions.reduce((acc, consumption) => {
      if (!acc[consumption.workspaceId]) {
        acc[consumption.workspaceId] = [];
      }
      acc[consumption.workspaceId].push(consumption);
      return acc;
    }, {} as Record<string, EnergyConsumption[]>);

    return Object.entries(workspaceGroups).map(([wsId, records]) => {
      const totalConsumption = records.reduce(
        (sum, record) => sum + Number(record.powerConsumptionKwh),
        0,
      );
      const averageDailyConsumption = totalConsumption / records.length;

      const sortedByConsumption = [...records].sort(
        (a, b) => Number(b.powerConsumptionKwh) - Number(a.powerConsumptionKwh),
      );

      return {
        workspaceId: wsId,
        workspaceName: records[0].workspaceName,
        totalConsumption: Math.round(totalConsumption * 100) / 100,
        averageDailyConsumption: Math.round(averageDailyConsumption * 100) / 100,
        daysTracked: records.length,
        lastRecordedDate: records[0].date,
        peakConsumptionDay: {
          date: sortedByConsumption[0].date,
          consumption: Number(sortedByConsumption[0].powerConsumptionKwh),
        },
        lowestConsumptionDay: {
          date: sortedByConsumption[sortedByConsumption.length - 1].date,
          consumption: Number(sortedByConsumption[sortedByConsumption.length - 1].powerConsumptionKwh),
        },
      };
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async logDailyMockData(): Promise<void> {
    this.logger.log('Starting daily mock energy data generation...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const promises = this.mockWorkspaces.map(async (workspace) => {
      const existingRecord = await this.energyRepository.findOne({
        where: {
          workspaceId: workspace.id,
          date: today,
        },
      });

      if (existingRecord) {
        this.logger.log(`Data already exists for workspace ${workspace.id} on ${today.toDateString()}`);
        return;
      }

      const mockData = this.generateMockConsumptionData(workspace.id);
      
      await this.create({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        date: today.toISOString().split('T')[0],
        ...mockData,
      });

      this.logger.log(
        `Generated mock data for ${workspace.name}: ${mockData.powerConsumptionKwh} kWh`,
      );
    });

    await Promise.all(promises);
    this.logger.log('Daily mock energy data generation completed');
  }

  async generateMockDataForDateRange(startDate: Date, endDate: Date): Promise<void> {
    this.logger.log(`Generating mock data from ${startDate.toDateString()} to ${endDate.toDateString()}`);

    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      for (const workspace of this.mockWorkspaces) {
        const existingRecord = await this.energyRepository.findOne({
          where: {
            workspaceId: workspace.id,
            date: new Date(dateStr),
          },
        });

        if (!existingRecord) {
          const mockData = this.generateMockConsumptionData(workspace.id);
          
          await this.create({
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            date: dateStr,
            ...mockData,
          });
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.logger.log('Mock data generation completed');
  }

  private generateMockConsumptionData(workspaceId: string): {
    powerConsumptionKwh: number;
    deviceCount: number;
    metadata: Record<string, any>;
  } {
    // Different consumption patterns for different workspace types
    const baseConsumption = {
      'ws-001': { min: 45, max: 85, devices: [15, 25] }, // Development
      'ws-002': { min: 25, max: 45, devices: [8, 15] },  // Marketing
      'ws-003': { min: 15, max: 35, devices: [5, 12] },  // Executive
      'ws-004': { min: 120, max: 180, devices: [30, 50] }, // Server Room
      'ws-005': { min: 10, max: 30, devices: [3, 8] },   // Conference
    };

    const config = baseConsumption[workspaceId] || baseConsumption['ws-001'];
    
    // Add some randomness and seasonal variation
    const seasonMultiplier = this.getSeasonalMultiplier();
    const randomVariation = 0.8 + Math.random() * 0.4; // ±20% variation
    
    const consumption = 
      (config.min + Math.random() * (config.max - config.min)) * 
      seasonMultiplier * 
      randomVariation;

    const deviceCount = 
      config.devices[0] + 
      Math.floor(Math.random() * (config.devices[1] - config.devices[0] + 1));

    return {
      powerConsumptionKwh: Math.round(consumption * 100) / 100,
      deviceCount,
      metadata: {
        temperature: Math.round((18 + Math.random() * 8) * 10) / 10, // 18-26°C
        humidity: Math.round((40 + Math.random() * 20) * 10) / 10,   // 40-60%
        occupancy: Math.round(Math.random() * 100),                  // 0-100%
        peakHours: Math.floor(8 + Math.random() * 4),               // 8-12 hours
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private getSeasonalMultiplier(): number {
    const month = new Date().getMonth();
    // Higher consumption in summer (AC) and winter (heating)
    const seasonalMap = [1.2, 1.1, 1.0, 0.9, 0.8, 1.3, 1.4, 1.4, 1.2, 1.0, 1.1, 1.2];
    return seasonalMap[month];
  }
}