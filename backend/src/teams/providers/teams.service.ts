import { Injectable } from '@nestjs/common';
import { CreateTeamDto } from '../dto/create-team.dto';
import { InviteTeamMemberDto } from '../dto/invite-team-member.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { CreateTeamProvider } from './create-team.provider';
import { InviteTeamMemberProvider } from './invite-team-member.provider';
import { FindMyTeamProvider } from './find-my-team.provider';
import { FindTeamByIdProvider } from './find-team-by-id.provider';
import { UpdateTeamProvider } from './update-team.provider';
import { RemoveTeamMemberProvider } from './remove-team-member.provider';

@Injectable()
export class TeamsService {
  constructor(
    private readonly createTeamProvider: CreateTeamProvider,
    private readonly inviteTeamMemberProvider: InviteTeamMemberProvider,
    private readonly findMyTeamProvider: FindMyTeamProvider,
    private readonly findTeamByIdProvider: FindTeamByIdProvider,
    private readonly updateTeamProvider: UpdateTeamProvider,
    private readonly removeTeamMemberProvider: RemoveTeamMemberProvider,
  ) {}

  create(dto: CreateTeamDto, userId: string): Promise<Team> {
    return this.createTeamProvider.create(dto, userId);
  }

  invite(
    teamId: string,
    dto: InviteTeamMemberDto,
    userId: string,
  ): Promise<TeamMember> {
    return this.inviteTeamMemberProvider.invite(teamId, dto, userId);
  }

  findMyTeam(userId: string): Promise<Team> {
    return this.findMyTeamProvider.find(userId);
  }

  findById(teamId: string, userId: string): Promise<Team> {
    return this.findTeamByIdProvider.find(teamId, userId);
  }

  update(teamId: string, dto: UpdateTeamDto, userId: string): Promise<Team> {
    return this.updateTeamProvider.update(teamId, dto, userId);
  }

  removeMember(teamId: string, memberUserId: string, userId: string): Promise<void> {
    return this.removeTeamMemberProvider.remove(teamId, memberUserId, userId);
  }
}
