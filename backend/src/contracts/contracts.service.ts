import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract, ContractStatus } from './entities/contract.entity';
import { CreateContractDto } from './dto/create-contract.dto';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private readonly repo: Repository<Contract>,
  ) {}

  async create(dto: CreateContractDto, adminId: string): Promise<Contract> {
    const contract = this.repo.create({
      ...dto,
      createdByAdminId: adminId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    return this.repo.save(contract);
  }

  async findAll(memberId?: string): Promise<Contract[]> {
    const where: any = {};
    if (memberId) where.memberId = memberId;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Contract> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Contract ${id} not found`);
    return c;
  }

  async send(id: string): Promise<Contract> {
    const c = await this.findOne(id);
    if (c.status !== ContractStatus.DRAFT) {
      throw new BadRequestException('Only draft contracts can be sent');
    }
    c.status = ContractStatus.SENT;
    c.sentAt = new Date();
    return this.repo.save(c);
  }

  async sign(id: string, memberId: string, signatureData: string): Promise<Contract> {
    const c = await this.findOne(id);
    if (c.memberId !== memberId) throw new BadRequestException('Contract not assigned to you');
    if (c.status !== ContractStatus.SENT) throw new BadRequestException('Contract is not awaiting signature');
    if (c.expiresAt && c.expiresAt < new Date()) throw new BadRequestException('Contract has expired');
    c.status = ContractStatus.SIGNED;
    c.signedAt = new Date();
    c.signatureData = signatureData;
    return this.repo.save(c);
  }

  async cancel(id: string): Promise<Contract> {
    const c = await this.findOne(id);
    c.status = ContractStatus.CANCELLED;
    return this.repo.save(c);
  }
}
