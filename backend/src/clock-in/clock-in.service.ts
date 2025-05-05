import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clockin } from './entities/clock-in.entity';
import { CreateClockinDto } from './dto/create-clock-in.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class ClockinService {
  constructor(
    @InjectRepository(Clockin)
    private clockinRepo: Repository<Clockin>,
    private auditLogService: AuditLogService
  ) {}

  async clockIn(data: CreateClockinDto): Promise<Clockin> {
    const record = this.clockinRepo.create({
      userId: data.userId,
      method: data.method || 'biometric',
    });

    const saved = await this.clockinRepo.save(record);

    // 🔒 Log the action
    await this.auditLogService.logAction(
      'USER_CLOCKED_IN',
      data.userId,
      `clockin:${saved.id}`,
      { method: saved.method }
    );

    return saved;
  }
}
