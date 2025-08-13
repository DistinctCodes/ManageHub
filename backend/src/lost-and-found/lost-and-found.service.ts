// src/lost-and-found/lost-and-found.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LostItem } from './entities/lost-item.entity';
import { CreateLostItemDto } from './dto/create-lost-item.dto';
import { ClaimLostItemDto } from './dto/claim-lost-item.dto';

@Injectable()
export class LostAndFoundService {
  constructor(
    @InjectRepository(LostItem)
    private lostItemRepo: Repository<LostItem>,
  ) {}

  async reportItem(dto: CreateLostItemDto): Promise<LostItem> {
    const item = this.lostItemRepo.create(dto);
    return await this.lostItemRepo.save(item);
  }

  async findAll(): Promise<LostItem[]> {
    return await this.lostItemRepo.find();
  }

  async findOne(id: string): Promise<LostItem> {
    const item = await this.lostItemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Lost item not found');
    return item;
  }

  async claimItem(id: string, dto: ClaimLostItemDto): Promise<LostItem> {
    const item = await this.findOne(id);
    if (item.claimed) {
      throw new BadRequestException('Item already claimed');
    }
    item.claimed = true;
    item.claimedBy = dto.claimedBy;
    return await this.lostItemRepo.save(item);
  }
}
