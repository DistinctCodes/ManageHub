import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAdminModeratorAccountSettingsDto } from './dto/create-admin-moderator-account-settings.dto';
import { UpdateAdminModeratorAccountSettingsDto } from './dto/update-admin-moderator-account-settings.dto';

@Injectable()
export class AdminModeratorAccountSettingsService {
  private readonly items: Array<{ id: string } & CreateAdminModeratorAccountSettingsDto> = [];

  findAll() {
    return this.items;
  }

  findOne(id: string) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) {
      throw new NotFoundException('AdminModeratorAccountSettings item not found');
    }
    return item;
  }

  create(payload: CreateAdminModeratorAccountSettingsDto) {
    const created = { id: crypto.randomUUID(), ...payload };
    this.items.push(created);
    return created;
  }

  update(id: string, payload: UpdateAdminModeratorAccountSettingsDto) {
    const item = this.findOne(id);
    Object.assign(item, payload);
    return item;
  }

  remove(id: string) {
    const index = this.items.findIndex((entry) => entry.id === id);
    if (index === -1) {
      throw new NotFoundException('AdminModeratorAccountSettings item not found');
    }
    this.items.splice(index, 1);
    return { id, deleted: true };
  }
}
