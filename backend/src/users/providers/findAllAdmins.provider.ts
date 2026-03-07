import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/userRoles.enum';
import { ErrorCatch } from '../../utils/error';

@Injectable()
export class FindAllAdminsProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getAdmins(): Promise<User[]> {
    try {
      return await this.usersRepository.find({
        where: { role: UserRole.ADMIN },
      });
    } catch (error) {
      ErrorCatch(error, 'Error fetching admins');
    }
  }
}
