import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { UpdateTeamDto } from '../dto/update-team.dto';

@Injectable()
export class UpdateTeamProvider {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
  ) {}

  async update(
    teamId: string,
    dto: UpdateTeamDto,
    userId: string,
  ): Promise<Team> {
    const team = await this.teamsRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId !== userId) {
      throw new BadRequestException('Only the team owner can update the team');
    }

    if (dto.seatLimit !== undefined && dto.seatLimit < 1) {
      throw new BadRequestException('seatLimit must be at least 1');
    }

    Object.assign(team, dto);

    return this.teamsRepository.save(team);
  }
}
