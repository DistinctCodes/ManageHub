import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Example actions:
//   'user.suspended'         – admin suspended a member account
//   'booking.cancelled'      – admin force-cancelled a booking
//   'workspace.deactivated'  – admin deactivated a workspace

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() actorId: string;
  @Column() actorEmail: string;
  @Column() action: string;
  @Column() targetType: string;
  @Column() targetId: string;
  @Column({ type: 'jsonb', nullable: true }) metadata: Record<string, any>;
  @CreateDateColumn() createdAt: Date;
}

export class AuditLogService {
  constructor(private readonly repo: any) {}

  async log(
    actor: { id: string; email: string },
    action: string,
    target: { type: string; id: string },
    metadata?: Record<string, any>,
  ) {
    return this.repo.save(
      this.repo.create({ actorId: actor.id, actorEmail: actor.email, action, targetType: target.type, targetId: target.id, metadata }),
    );
  }

  // GET /sandbox/audit-logs?page=1&limit=20&action=&actorId=  (super_admin only)
  async getLogs(filters: { action?: string; actorId?: string; page?: number; limit?: number }) {
    const { action, actorId, page = 1, limit = 20 } = filters;
    const qb = this.repo.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');
    if (action) qb.andWhere('log.action = :action', { action });
    if (actorId) qb.andWhere('log.actorId = :actorId', { actorId });
    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}
