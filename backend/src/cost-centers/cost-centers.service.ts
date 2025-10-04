import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CostCenter } from './entities/cost-center.entity';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';

@Injectable()
export class CostCentersService {
  constructor(
    @InjectRepository(CostCenter)
    private readonly costCenterRepository: Repository<CostCenter>,
  ) {}

  async create(createDto: CreateCostCenterDto): Promise<CostCenter> {
    // Check if cost center with same name already exists
    const existing = await this.costCenterRepository.findOne({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Cost center with name '${createDto.name}' already exists`,
      );
    }

    const costCenter = this.costCenterRepository.create(createDto);
    return await this.costCenterRepository.save(costCenter);
  }

  async findAll(includeInactive = false): Promise<CostCenter[]> {
    const query = this.costCenterRepository.createQueryBuilder('cc');

    if (!includeInactive) {
      query.where('cc.isActive = :isActive', { isActive: true });
    }

    return await query.orderBy('cc.name', 'ASC').getMany();
  }

  async findOne(id: string): Promise<CostCenter> {
    const costCenter = await this.costCenterRepository.findOne({
      where: { id },
      // Uncomment when you have relationships
      // relations: ['assets', 'expenses'],
    });

    if (!costCenter) {
      throw new NotFoundException(`Cost center with ID '${id}' not found`);
    }

    return costCenter;
  }

  async update(
    id: string,
    updateDto: UpdateCostCenterDto,
  ): Promise<CostCenter> {
    const costCenter = await this.findOne(id);

    // Check name uniqueness if name is being updated
    if (updateDto.name && updateDto.name !== costCenter.name) {
      const existing = await this.costCenterRepository.findOne({
        where: { name: updateDto.name },
      });

      if (existing) {
        throw new ConflictException(
          `Cost center with name '${updateDto.name}' already exists`,
        );
      }
    }

    Object.assign(costCenter, updateDto);
    return await this.costCenterRepository.save(costCenter);
  }

  async remove(id: string): Promise<void> {
    const costCenter = await this.findOne(id);
    await this.costCenterRepository.remove(costCenter);
  }

  async softDelete(id: string): Promise<CostCenter> {
    const costCenter = await this.findOne(id);
    costCenter.isActive = false;
    return await this.costCenterRepository.save(costCenter);
  }

  async restore(id: string): Promise<CostCenter> {
    const costCenter = await this.findOne(id);
    costCenter.isActive = true;
    return await this.costCenterRepository.save(costCenter);
  }

  // Financial reporting method
  async getFinancialReport(id: string) {
    const costCenter = await this.findOne(id);

    // This is a placeholder for financial reporting
    // Implement actual aggregations when you have Asset and Expense entities
    return {
      costCenter: {
        id: costCenter.id,
        name: costCenter.name,
        description: costCenter.description,
      },
      summary: {
        totalAssets: 0,
        totalAssetValue: 0,
        totalExpenses: 0,
        totalExpenseAmount: 0,
      },
      // assets: [],
      // expenses: [],
    };
  }
}