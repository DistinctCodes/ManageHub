import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../workspaces/entities/workspace.entity';

export interface WorkspaceFilterResult {
  total: number;
  page: number;
  limit: number;
  data: Workspace[];
}

@Injectable()
export class WorkspaceFilterService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
  ) {}

  /**
   * Filters workspaces by amenities (AND logic, case-insensitive).
   * amenities is a comma-separated string e.g. "wifi,standing-desk".
   */
  async filterByAmenities(
    amenitiesParam: string | undefined,
    page = 1,
    limit = 10,
  ): Promise<WorkspaceFilterResult> {
    if (
      page < 1 ||
      limit < 1 ||
      !Number.isInteger(page) ||
      !Number.isInteger(limit)
    ) {
      throw new BadRequestException('page and limit must be positive integers');
    }

    const qb = this.workspaceRepo
      .createQueryBuilder('w')
      .where('w.isActive = :active', { active: true });

    if (amenitiesParam !== undefined && amenitiesParam.trim() !== '') {
      // Validate: only allow alphanumeric, hyphens, underscores, spaces, commas
      if (!/^[\w\s,\-]+$/.test(amenitiesParam)) {
        throw new BadRequestException('amenities param is malformed');
      }

      const requested = amenitiesParam
        .split(',')
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean);

      if (!requested.length) {
        throw new BadRequestException('amenities param is malformed');
      }

      // simple-array stores values as comma-separated; use LOWER + LIKE for each
      for (const amenity of requested) {
        qb.andWhere(
          `LOWER(w.amenities) LIKE :am_${amenity.replace(/-/g, '_')}`,
          {
            [`am_${amenity.replace(/-/g, '_')}`]: `%${amenity}%`,
          },
        );
      }
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { total, page, limit, data };
  }
}
