import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';

@Injectable()
export class FindTeamByIdProvider {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
  ) {}

  async find(teamId: string, userId: string): Promise<Team> {
    const membership = await this.teamMembersRepository.findOne({
      where: { teamId, userId },
    });

    if (!membership) {
      throw new NotFoundException('You are not a member of this team');
    }

    const team = await this.teamsRepository.findOne({
      where: { id: teamId },
      relations: ['owner', 'members', 'members.user'],
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }
}
