import { Injectable, NotFoundException } from '@nestjs/common';

interface Workspace {
  id: string;
  name: string;
  isActive: boolean;
}

// Simulated in-memory store — replace with TypeORM repository in production
const workspaces = new Map<string, Workspace>([
  ['ws-1', { id: 'ws-1', name: 'Hot Desk A', isActive: true }],
  ['ws-2', { id: 'ws-2', name: 'Private Office B', isActive: true }],
]);

@Injectable()
export class WorkspaceAdminService {
  findAll(includeInactive = false): Workspace[] {
    const all = Array.from(workspaces.values());
    return includeInactive ? all : all.filter(w => w.isActive);
  }

  deactivate(id: string): Workspace {
    return this.setActive(id, false);
  }

  reactivate(id: string): Workspace {
    return this.setActive(id, true);
  }

  private setActive(id: string, isActive: boolean): Workspace {
    const workspace = workspaces.get(id);
    if (!workspace) throw new NotFoundException(`Workspace ${id} not found`);
    workspace.isActive = isActive;
    workspaces.set(id, workspace);
    return workspace;
  }
}
