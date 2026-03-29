import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBadgesNftDto } from './dto/create-badges-nft.dto';
import { UpdateBadgesNftDto } from './dto/update-badges-nft.dto';

@Injectable()
export class BadgesNftService {
  private readonly items: Array<{ id: string } & CreateBadgesNftDto> = [];

  findAll() {
    return this.items;
  }

  findOne(id: string) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) {
      throw new NotFoundException('BadgesNft item not found');
    }
    return item;
  }

  create(payload: CreateBadgesNftDto) {
    const created = { id: crypto.randomUUID(), ...payload };
    this.items.push(created);
    return created;
  }

  update(id: string, payload: UpdateBadgesNftDto) {
    const item = this.findOne(id);
    Object.assign(item, payload);
    return item;
  }

  remove(id: string) {
    const index = this.items.findIndex((entry) => entry.id === id);
    if (index === -1) {
      throw new NotFoundException('BadgesNft item not found');
    }
    this.items.splice(index, 1);
    return { id, deleted: true };
  }
}
