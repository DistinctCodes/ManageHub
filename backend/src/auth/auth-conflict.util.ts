import { ConflictException } from '@nestjs/common';

/** #2082: map a Postgres unique violation (23505) on email to a 409. */
export function rethrowEmailConflict(err: unknown): never {
  if ((err as { code?: string })?.code === '23505') {
    throw new ConflictException('Email is already registered');
  }
  throw err;
}

/** #2083: block self-demotion and demoting the last remaining admin. */
export function assertRoleChangeAllowed(opts: {
  actorId: string; targetId: string; currentRole: string; newRole: string; adminCount: number;
}): void {
  if (opts.currentRole !== 'admin' || opts.newRole === 'admin') return;
  if (opts.actorId === opts.targetId) throw new ConflictException('Admins cannot demote themselves');
  if (opts.adminCount <= 1) throw new ConflictException('Cannot demote the last admin');
}
