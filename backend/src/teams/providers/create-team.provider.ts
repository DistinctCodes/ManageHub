import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { TeamMemberRole } from '../enums/team-member-role.enum';
import { CreateTeamDto } from '../dto/create-team.dto';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class CreateTeamProvider {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTeamDto, userId: string): Promise<Team> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const existing = await this.teamsRepository.findOne({
      where: { ownerId: userId },
    });
    if (existing) {
      throw new BadRequestException('You already own a team');
    }

    return this.dataSource.transaction(async (manager) => {
      const team = manager.create(Team, {
        ...dto,
        ownerId: userId,
        seatLimit: dto.seatLimit ?? 5,
      });

      const saved = await manager.save(team);

      const member = manager.create(TeamMember, {
        teamId: saved.id,
        userId,
        role: TeamMemberRole.OWNER,
      });

      await manager.save(member);

      return saved;
    });
  }
}
