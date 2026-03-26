import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../entities/workspace.entity';
import { FindWorkspaceByIdProvider } from './find-workspace-by-id.provider';

@Injectable()
export class DeleteWorkspaceProvider {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspacesRepository: Repository<Workspace>,
    private readonly findWorkspaceByIdProvider: FindWorkspaceByIdProvider,
  ) {}

  async softDelete(id: string): Promise<void> {
    const workspace = await this.findWorkspaceByIdProvider.findById(id);
    workspace.isActive = false;
    await this.workspacesRepository.save(workspace);
  }
}
