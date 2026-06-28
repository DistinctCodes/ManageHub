import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FloorPlan } from './entities/floor-plan.entity';
import { FloorPlanZone } from './entities/floor-plan-zone.entity';
import { CreateFloorPlanDto } from './dto/create-floor-plan.dto';
import { SaveZonesDto } from './dto/save-zones.dto';

@Injectable()
export class FloorPlanService {
  constructor(
    @InjectRepository(FloorPlan)
    private readonly planRepo: Repository<FloorPlan>,
    @InjectRepository(FloorPlanZone)
    private readonly zoneRepo: Repository<FloorPlanZone>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateFloorPlanDto): Promise<FloorPlan> {
    const plan = this.planRepo.create(dto);
    return this.planRepo.save(plan);
  }

  async update(id: string, dto: Partial<CreateFloorPlanDto>): Promise<FloorPlan> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Floor plan ${id} not found`);
    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  async saveZones(id: string, dto: SaveZonesDto): Promise<FloorPlan> {
    const plan = await this.planRepo.findOne({ where: { id }, relations: ['zones'] });
    if (!plan) throw new NotFoundException(`Floor plan ${id} not found`);
    await this.zoneRepo.delete({ floorPlanId: id });
    const zones = dto.zones.map((z) => this.zoneRepo.create({ ...z, floorPlanId: id }));
    await this.zoneRepo.save(zones);
    return this.planRepo.findOne({ where: { id }, relations: ['zones'] }) as Promise<FloorPlan>;
  }

  async getActive(): Promise<FloorPlan | null> {
    return this.planRepo.findOne({ where: { isActive: true }, relations: ['zones'] });
  }

  async findAll(): Promise<FloorPlan[]> {
    return this.planRepo.find({ order: { createdAt: 'DESC' } });
  }

  async activate(id: string): Promise<FloorPlan> {
    await this.planRepo.update({}, { isActive: false });
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Floor plan ${id} not found`);
    plan.isActive = true;
    return this.planRepo.save(plan);
  }
}
