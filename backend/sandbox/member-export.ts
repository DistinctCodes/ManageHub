import { Controller, Get, Query, Res, UseGuards, BadRequestException, ForbiddenException, Req } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { stringify } from 'csv-stringify';

@Controller('sandbox/admin/members')
@UseGuards(JwtAuthGuard)
export class MemberExportController {
  constructor(@InjectRepository('User') private readonly users: Repository<any>) {}

  @Get('export.csv')
  async exportCsv(
    @Req() req: any,
    @Res() res: Response,
    @Query('role') role?: string,
    @Query('membershipStatus') membershipStatus?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (req.user.role !== 'admin') throw new ForbiddenException();

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (fromDate && toDate && fromDate > toDate)
      throw new BadRequestException('`from` must be before `to`');

    const qb = this.users.createQueryBuilder('u')
      .select(['u.id', 'u.firstName', 'u.lastName', 'u.email', 'u.role', 'u.membershipStatus', 'u.createdAt']);

    if (role) qb.andWhere('u.role = :role', { role });
    if (membershipStatus) qb.andWhere('u.membershipStatus = :membershipStatus', { membershipStatus });
    if (fromDate) qb.andWhere('u.createdAt >= :from', { from: fromDate });
    if (toDate) qb.andWhere('u.createdAt <= :to', { to: toDate });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="members.csv"');

    const columns = ['memberId', 'firstName', 'lastName', 'email', 'role', 'membershipStatus', 'joinedAt', 'totalBookings', 'totalCheckins'];
    const stringifier = stringify({ header: true, columns });
    stringifier.pipe(res);

    const stream = await qb.stream();
    stream.on('data', (row: any) => stringifier.write([row.u_id, row.u_firstName, row.u_lastName, row.u_email, row.u_role, row.u_membershipStatus, row.u_createdAt, 0, 0]));
    stream.on('end', () => stringifier.end());
    stream.on('error', (err: Error) => { stringifier.end(); res.destroy(err); });
  }
}
