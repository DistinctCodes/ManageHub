import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WorkLog } from "./entities/work-log.entity";
import { CreateWorkLogDto } from "./dto/create-work-log.dto";
import { UpdateWorkLogDto } from "./dto/update-work-log.dto";

@Injectable()
export class WorkLogService {
  constructor(
    @InjectRepository(WorkLog)
    private readonly workLogRepo: Repository<WorkLog>
  ) {}

  async create(dto: CreateWorkLogDto): Promise<WorkLog> {
    const workLog = this.workLogRepo.create(dto);
    return this.workLogRepo.save(workLog);
  }

  async findAll(): Promise<WorkLog[]> {
    return this.workLogRepo.find();
  }

  async findOne(id: string): Promise<WorkLog> {
    const workLog = await this.workLogRepo.findOne({ where: { id } });
    if (!workLog) throw new NotFoundException("Work log not found");
    return workLog;
  }

  async update(id: string, dto: UpdateWorkLogDto): Promise<WorkLog> {
    const workLog = await this.findOne(id);
    Object.assign(workLog, dto);
    return this.workLogRepo.save(workLog);
  }

  async remove(id: string): Promise<void> {
    const workLog = await this.findOne(id);
    await this.workLogRepo.remove(workLog);
  }
}
