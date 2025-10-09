import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { UserRole } from '../enums/userRoles.enum';
import { ErrorCatch } from '../../utils/error';

@Injectable()
export class FindAdminByIdProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  public async getAdmin(id: string): Promise<User> {
    try {
      const admin = await this.usersRepository.findOne({
        where: {
          id,
          role: UserRole.ADMIN,
        },
      });

      if (!admin) {
        throw new NotFoundException(`Admin with ID ${id} not found`);
      }

      return admin;
    } catch (error) {
      ErrorCatch(error, 'Error retrieving admin details');
    }
  }
}
