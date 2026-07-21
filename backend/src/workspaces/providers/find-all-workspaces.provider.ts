import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceQueryDto } from '../dto/workspace-query.dto';

export interface PaginatedWorkspaces {
  data: Workspace[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class FindAllWorkspacesProvider {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspacesRepository: Repository<Workspace>,
  ) {}

  async findAll(
    query: WorkspaceQueryDto,
    adminView = false,
  ): Promise<PaginatedWorkspaces> {
    const { page = 1, limit = 20, type, minSeats, maxRate, search } = query;

    const qb = this.workspacesRepository.createQueryBuilder('workspace');

    if (!adminView) {
      qb.where('workspace.isActive = :isActive', { isActive: true });
    }

    if (type) {
      qb.andWhere('workspace.type = :type', { type });
    }

    if (minSeats) {
      // Filters by total capacity, not live availability — availableSeats is
      // stale (see BE-01). Live per-date-range availability isn't meaningful
      // here since this endpoint has no date-range param; use
      // GET /workspaces/:id/availability for a live, date-scoped check.
      qb.andWhere('workspace.totalSeats >= :minSeats', { minSeats });
    }

    if (maxRate) {
      qb.andWhere('workspace.hourlyRate <= :maxRate', { maxRate });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(workspace.name) LIKE :search OR LOWER(workspace.description) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('workspace.createdAt', 'DESC')
      .getMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
