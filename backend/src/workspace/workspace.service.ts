
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from './entities/workspace.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(Workspace)
    private workspaceRepo: Repository<Workspace>,
    private auditLogService: AuditLogService,
  ) {}

  async createWorkspace(dto: CreateWorkspaceDto): Promise<Workspace> {
    const workspace = this.workspaceRepo.create({
      name: dto.name,
      location: dto.location,
    });

    const saved = await this.workspaceRepo.save(workspace);

    // 🔒 Log workspace creation
    await this.auditLogService.logAction(
      'WORKSPACE_CREATED',
      dto.createdBy,
      `workspace:${saved.id}`,
      { name: saved.name, location: saved.location }
    );

    return saved;
  }
}
