import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, Between } from "typeorm";
import { Visitor } from "./visitor.entity";
import {
  CreateVisitorDto,
  UpdateVisitorDto,
  SearchVisitorDto,
} from "./visitor.dto";

@Injectable()
export class VisitorService {
  constructor(
    @InjectRepository(Visitor)
    private visitorRepository: Repository<Visitor>
  ) {}

  async create(createVisitorDto: CreateVisitorDto): Promise<Visitor> {
    const visitor = this.visitorRepository.create({
      ...createVisitorDto,
      entryTime: new Date(createVisitorDto.entryTime),
    });
    return await this.visitorRepository.save(visitor);
  }

  async findAll(): Promise<Visitor[]> {
    return await this.visitorRepository.find({
      order: { entryTime: "DESC" },
    });
  }

  async findOne(id: number): Promise<Visitor> {
    const visitor = await this.visitorRepository.findOne({ where: { id } });
    if (!visitor) {
      throw new NotFoundException(`Visitor with ID ${id} not found`);
    }
    return visitor;
  }

  async update(
    id: number,
    updateVisitorDto: UpdateVisitorDto
  ): Promise<Visitor> {
    const visitor = await this.findOne(id);

    const updateData: Partial<Visitor> = { ...updateVisitorDto };

    if (updateVisitorDto.entryTime) {
      updateData.entryTime = new Date(updateVisitorDto.entryTime);
    }

    if (updateVisitorDto.exitTime) {
      updateData.exitTime = new Date(updateVisitorDto.exitTime);
    }

    await this.visitorRepository.update(id, updateData);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const visitor = await this.findOne(id);
    await this.visitorRepository.remove(visitor);
  }

  async checkOut(id: number): Promise<Visitor> {
    const visitor = await this.findOne(id);

    if (visitor.exitTime) {
      throw new BadRequestException("Visitor has already checked out");
    }

    visitor.exitTime = new Date();
    return await this.visitorRepository.save(visitor);
  }

  async search(searchDto: SearchVisitorDto): Promise<Visitor[]> {
    const query = this.visitorRepository.createQueryBuilder("visitor");

    if (searchDto.name) {
      query.andWhere("visitor.fullName ILIKE :name", {
        name: `%${searchDto.name}%`,
      });
    }

    if (searchDto.date) {
      const searchDate = new Date(searchDto.date);
      const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));

      query.andWhere("visitor.entryTime BETWEEN :startOfDay AND :endOfDay", {
        startOfDay,
        endOfDay,
      });
    }

    if (searchDto.startDate && searchDto.endDate) {
      query.andWhere("visitor.entryTime BETWEEN :startDate AND :endDate", {
        startDate: new Date(searchDto.startDate),
        endDate: new Date(searchDto.endDate),
      });
    }

    return await query.orderBy("visitor.entryTime", "DESC").getMany();
  }

  async getActiveVisitors(): Promise<Visitor[]> {
    return await this.visitorRepository.find({
      where: { exitTime: null },
      order: { entryTime: "DESC" },
    });
  }

  async getVisitorStats() {
    const totalVisitors = await this.visitorRepository.count();
    const activeVisitors = await this.visitorRepository.count({
      where: { exitTime: null },
    });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayVisitors = await this.visitorRepository.count({
      where: {
        entryTime: Between(todayStart, todayEnd),
      },
    });

    return {
      totalVisitors,
      activeVisitors,
      todayVisitors,
    };
  }
}
