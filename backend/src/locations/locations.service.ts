import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
  ) {}

  async create(dto: CreateLocationDto): Promise<Location> {
    const location = this.locationRepo.create(dto);
    return this.locationRepo.save(location);
  }

  async findAll(): Promise<Location[]> {
    return this.locationRepo.find({ where: { isActive: true } });
  }

  async findById(id: string): Promise<Location> {
    const location = await this.locationRepo.findOne({ where: { id } });
    if (!location) throw new NotFoundException(`Location ${id} not found`);
    return location;
  }

  async update(id: string, dto: UpdateLocationDto): Promise<Location> {
    const location = await this.findById(id);
    Object.assign(location, dto);
    return this.locationRepo.save(location);
  }

  async remove(id: string): Promise<void> {
    const location = await this.locationRepo.findOne({
      where: { id },
      relations: ['workspaces'],
    });
    if (!location) throw new NotFoundException(`Location ${id} not found`);
    const workspaces = (location as any).workspaces;
    if (workspaces?.length > 0) {
      throw new ConflictException(
        'Cannot delete a location that has associated workspaces',
      );
    }
    await this.locationRepo.remove(location);
  }
}