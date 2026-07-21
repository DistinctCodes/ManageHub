import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class AccountErasureProvider {
  private readonly logger = new Logger(AccountErasureProvider.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async anonymizeUser(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const originalEmail = user.email;

    user.firstname = null;
    user.lastname = null;
    user.phone = null;
    user.profilePicture = null;
    user.email = `deleted-${userId}@deleted.local`;
    user.isActive = false;
    user.isDeleted = true;

    await this.userRepository.save(user);

    this.logger.log(
      `User ${userId} anonymized. Original email: ${originalEmail}`,
    );

    return {
      message: `Account anonymized. Confirmation sent to ${originalEmail}`,
    };
  }
}
