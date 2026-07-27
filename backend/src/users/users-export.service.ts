// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Workbook } from 'exceljs';
import { Parser } from 'json2csv';

@Injectable()
export class UsersExportService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async exportUsersCsv(): Promise<Buffer> {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });

    const data = users.map((u) => ({
      id: u.id,
      name: `${u.firstname} ${u.lastname}`,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt?.toISOString() ?? '',
      lastLogin: '',
    }));

    const parser = new Parser({
      fields: ['id', 'name', 'email', 'role', 'createdAt', 'lastLogin'],
    });

    return Buffer.from(parser.parse(data), 'utf-8');
  }

  async exportUsersExcel(): Promise<Buffer> {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });

    const workbook = new Workbook();
    workbook.creator = 'ManageHub';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Users');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Last Login', key: 'lastLogin', width: 22 },
    ];

    sheet.getRow(1).font = { bold: true };

    users.forEach((u) => {
      sheet.addRow({
        id: u.id,
        name: `${u.firstname} ${u.lastname}`,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt?.toISOString() ?? '',
        lastLogin: '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
