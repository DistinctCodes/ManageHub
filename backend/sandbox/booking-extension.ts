import {
  Controller, Post, Patch, Body, Param, UseGuards,
  NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { RolesGuard } from '../src/auth/guard/roles.guard';
import { Roles } from '../src/auth/decorators/roles.decorators';
import { UserRole } from '../src/users/enums/userRoles.enum';

export type ExtensionStatus = 'pending' | 'approved' | 'rejected';

@Entity()
export class BookingExtensionRequest {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() bookingId: string;
  @Column() userId: string;
  @Column({ type: 'date' }) newEndDate: string;
  @Column({ default: 'pending' }) status: ExtensionStatus;
  @CreateDateColumn() createdAt: Date;
}

@Controller('sandbox/bookings')
@UseGuards(RolesGuard)
export class BookingExtensionController {
  constructor(
    @InjectRepository(BookingExtensionRequest)
    private readonly extRepo: Repository<BookingExtensionRequest>,
  ) {}

  @Post(':id/extend')
  async requestExtension(
    @Param('id') bookingId: string,
    @Body() dto: { newEndDate: string; userId: string },
  ) {
    const pending = await this.extRepo.findOne({ where: { bookingId, status: 'pending' } });
    if (pending) throw new ConflictException('Extension request already pending');

    const req = this.extRepo.create({ bookingId, userId: dto.userId, newEndDate: dto.newEndDate });
    return this.extRepo.save(req);
  }

  @Patch('extensions/:id/approve')
  @Roles(UserRole.ADMIN)
  async approve(@Param('id') id: string) {
    const ext = await this.extRepo.findOneOrFail({ where: { id } }).catch(() => {
      throw new NotFoundException('Extension request not found');
    });
    ext.status = 'approved';
    return this.extRepo.save(ext);
  }

  @Patch('extensions/:id/reject')
  @Roles(UserRole.ADMIN)
  async reject(@Param('id') id: string) {
    const ext = await this.extRepo.findOneOrFail({ where: { id } }).catch(() => {
      throw new NotFoundException('Extension request not found');
    });
    ext.status = 'rejected';
    return this.extRepo.save(ext);
  }
}
