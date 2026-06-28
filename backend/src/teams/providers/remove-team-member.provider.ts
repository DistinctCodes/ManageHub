import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { TeamMemberRole } from '../enums/team-member-role.enum';

@Injectable()
export class RemoveTeamMemberProvider {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
  ) {}

  async remove(
    teamId: string,
    memberUserId: string,
    currentUserId: string,
  ): Promise<void> {
    const team = await this.teamsRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId !== currentUserId) {
      throw new BadRequestException(
        'Only the team owner can remove members',
      );
    }

    if (memberUserId === currentUserId) {
      throw new BadRequestException('You cannot remove yourself as owner');
    }

    const member = await this.teamMembersRepository.findOne({
      where: { teamId, userId: memberUserId, role: TeamMemberRole.MEMBER },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.teamMembersRepository.remove(member);
  }
}
