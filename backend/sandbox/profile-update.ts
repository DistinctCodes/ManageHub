import { Body, Controller, HttpCode, HttpException, HttpStatus, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

const NIGERIAN_PHONE = /^(\+234|0)[789]\d{9}$/;

function profileCompleteness(user: Partial<User>): number {
  const fields = ['firstname', 'lastname', 'username', 'phone', 'email'];
  const filled = fields.filter((f) => !!(user as any)[f]).length;
  return Math.round((filled / fields.length) * 100);
}

@Controller('sandbox')
@UseGuards(JwtAuthGuard)
export class ProfileUpdateController {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Req() req: any,
    @Body() body: { firstname?: string; lastname?: string; username?: string; phone?: string },
  ) {
    const { firstname, lastname, username, phone } = body;
    const userId: string = req.user.id;

    if (phone && !NIGERIAN_PHONE.test(phone)) {
      throw new HttpException('Invalid Nigerian phone number', HttpStatus.BAD_REQUEST);
    }

    if (username) {
      const taken = await this.users.findOne({ where: { username } });
      if (taken && taken.id !== userId) {
        throw new HttpException('Username already taken', HttpStatus.CONFLICT);
      }
    }

    const user = await this.users.findOneOrFail({ where: { id: userId } });
    Object.assign(user, { firstname, lastname, username, phone });
    (user as any).profileCompleteness = profileCompleteness(user);
    await this.users.save(user);

    const { password, refreshToken, ...safe } = user as any;
    return safe;
  }
}
