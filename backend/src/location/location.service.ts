import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from './entities/location.entity';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async create(createLocationDto: CreateLocationDto): Promise<Location> {
    // Check if location name already exists
    const existingLocation = await this.locationRepository.findOne({
      where: { name: createLocationDto.name },
    });

    if (existingLocation) {
      throw new ConflictException('Location name already exists');
    }

    const location = this.locationRepository.create(createLocationDto);
    return this.locationRepository.save(location);
  }

  async findAll(): Promise<Location[]> {
    return this.locationRepository.find({
      relations: ['shifts'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { id },
      relations: ['shifts', 'shifts.staff'],
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  async update(
    id: string,
    updateLocationDto: UpdateLocationDto,
  ): Promise<Location> {
    const location = await this.findOne(id);

    // Check if trying to update to an existing location name
    if (updateLocationDto.name && updateLocationDto.name !== location.name) {
      const existingLocation = await this.locationRepository.findOne({
        where: { name: updateLocationDto.name },
      });

      if (existingLocation) {
        throw new ConflictException('Location name already exists');
      }
    }

    Object.assign(location, updateLocationDto);
    return this.locationRepository.save(location);
  }

  async remove(id: string): Promise<void> {
    const location = await this.findOne(id);
    await this.locationRepository.remove(location);
  }

  async getActiveLocations(): Promise<Location[]> {
    return this.locationRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }
}
