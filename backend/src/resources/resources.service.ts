import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private readonly resourcesRepo: Repository<Resource>,
  ) {}

  findAll(): Promise<Resource[]> {
    return this.resourcesRepo.find({ where: { isAvailable: true }, order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Resource> {
    const resource = await this.resourcesRepo.findOneBy({ id });
    if (!resource) throw new NotFoundException(`Resource ${id} not found`);
    return resource;
  }

  create(dto: CreateResourceDto): Promise<Resource> {
    const resource = this.resourcesRepo.create(dto);
    return this.resourcesRepo.save(resource);
  }

  async update(id: string, dto: UpdateResourceDto): Promise<Resource> {
    const resource = await this.findOne(id);
    Object.assign(resource, dto);
    return this.resourcesRepo.save(resource);
  }

  async softDelete(id: string): Promise<void> {
    const resource = await this.findOne(id);
    resource.isAvailable = false;
    await this.resourcesRepo.save(resource);
  }

  /**
   * Validate that all given resource IDs exist and are available.
   * Returns the matched resources so callers can compute total add-on cost.
   */
  async validateAndFetch(resourceIds: string[]): Promise<Resource[]> {
    if (!resourceIds.length) return [];
    const resources = await this.resourcesRepo.find({ where: { id: In(resourceIds) } });
    const unavailable = resources.filter((r) => !r.isAvailable);
    if (unavailable.length) {
      throw new BadRequestException(
        `Resources unavailable: ${unavailable.map((r) => r.name).join(', ')}`,
      );
    }
    const missing = resourceIds.filter((id) => !resources.find((r) => r.id === id));
    if (missing.length) {
      throw new NotFoundException(`Resources not found: ${missing.join(', ')}`);
    }
    return resources;
  }

  /** Compute total add-on cost in kobo for a list of resources */
  computeAddonTotal(resources: Resource[]): number {
    return resources.reduce((sum, r) => sum + r.priceKoboPerSession, 0);
  }

  /**
   * Check availability for a list of resource IDs.
   * Returns a map of resourceId -> { available: boolean, name: string }.
   */
  async checkAvailability(
    resourceIds: string[],
  ): Promise<Array<{ id: string; name: string; available: boolean }>> {
    const resources = await this.resourcesRepo.find({ where: { id: In(resourceIds) } });
    return resourceIds.map((id) => {
      const r = resources.find((res) => res.id === id);
      return { id, name: r?.name ?? 'Unknown', available: r?.isAvailable ?? false };
    });
  }
}