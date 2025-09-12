import { Injectable } from '@nestjs/common';
import { Workspace } from './entities/workspace.entity';

@Injectable()
export class WorkspacesService {
  private workspaces: Workspace[] = [
    { id: '1', name: 'Workspace A', capacity: 10, status: 'available' },
    { id: '2', name: 'Workspace B', capacity: 20, status: 'occupied' },
    { id: '3', name: 'Workspace C', capacity: 15, status: 'maintenance' },
  ];

  findAll(): Workspace[] {
    return this.workspaces;
  }
}
