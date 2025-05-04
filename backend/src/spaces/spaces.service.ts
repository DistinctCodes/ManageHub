import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { Workspace } from "./entities/workspace.entity"
import type { CreateWorkspaceDto } from "./dto/create-workspace.dto"
import type { UpdateWorkspaceStatusDto } from "./dto/update-workspace-status.dto"
import type { FilterWorkspaceDto } from "./dto/filter-workspace.dto"

@Injectable()
export class SpacesService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
  ) {}

  async create(createWorkspaceDto: CreateWorkspaceDto): Promise<Workspace> {
    const workspace = this.workspaceRepository.create(createWorkspaceDto)
    return this.workspaceRepository.save(workspace)
  }

  async findAll(filterDto: FilterWorkspaceDto): Promise<Workspace[]> {
    const { type, location, isAvailable } = filterDto
    const queryBuilder = this.workspaceRepository.createQueryBuilder("workspace")

    if (type) {
      queryBuilder.andWhere("workspace.type = :type", { type })
    }

    if (location) {
      queryBuilder.andWhere("workspace.location LIKE :location", { location: `%${location}%` })
    }

    if (isAvailable !== undefined) {
      queryBuilder.andWhere("workspace.isAvailable = :isAvailable", { isAvailable })
    }

    return queryBuilder.getMany()
  }

  async findOne(id: string): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findOne({ where: { id } })
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID "${id}" not found`)
    }
    return workspace
  }

  async updateStatus(id: string, updateStatusDto: UpdateWorkspaceStatusDto): Promise<Workspace> {
    const workspace = await this.findOne(id)
    workspace.isAvailable = updateStatusDto.isAvailable
    return this.workspaceRepository.save(workspace)
  }

  async remove(id: string): Promise<void> {
    const result = await this.workspaceRepository.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException(`Workspace with ID "${id}" not found`)
    }
  }
}
