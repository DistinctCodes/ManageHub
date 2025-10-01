import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateUserDto } from '../dto/updateUser.dto';
import { ErrorCatch } from '../../utils/error';

@Injectable()
export class UpdateUserProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async updateUser(id: string, updateData: UpdateUserDto): Promise<User> {
    try {
      const user = await this.usersRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('No fields provided for update');
      }

      Object.assign(user, updateData);
      return await this.usersRepository.save(user);
    } catch (error) {
      ErrorCatch(error, 'Failed to update user');
    }
  }
}
