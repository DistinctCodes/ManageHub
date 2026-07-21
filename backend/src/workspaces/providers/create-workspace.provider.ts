import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../entities/workspace.entity';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';

@Injectable()
export class CreateWorkspaceProvider {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspacesRepository: Repository<Workspace>,
  ) {}

  async create(dto: CreateWorkspaceDto): Promise<Workspace> {
    const existing = await this.workspacesRepository.findOne({
      where: { name: dto.name, isActive: true },
    });
    if (existing) {
      throw new ConflictException(
        `A workspace named "${dto.name}" already exists`,
      );
    }

    const workspace = this.workspacesRepository.create({
      ...dto,
      availableSeats: dto.totalSeats,
    });
    return this.workspacesRepository.save(workspace);
  }
}
