import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { User } from '../users/entities/user.entity';
import { TeamsService } from './providers/teams.service';
import { TeamsController } from './teams.controller';
import { CreateTeamProvider } from './providers/create-team.provider';
import { InviteTeamMemberProvider } from './providers/invite-team-member.provider';
import { FindMyTeamProvider } from './providers/find-my-team.provider';
import { FindTeamByIdProvider } from './providers/find-team-by-id.provider';
import { UpdateTeamProvider } from './providers/update-team.provider';
import { RemoveTeamMemberProvider } from './providers/remove-team-member.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Team, TeamMember, User])],
  controllers: [TeamsController],
  providers: [
    TeamsService,
    CreateTeamProvider,
    InviteTeamMemberProvider,
    FindMyTeamProvider,
    FindTeamByIdProvider,
    UpdateTeamProvider,
    RemoveTeamMemberProvider,
  ],
  exports: [TeamsService],
})
export class TeamsModule {}
