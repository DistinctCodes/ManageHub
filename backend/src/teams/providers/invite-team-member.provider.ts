import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { TeamMemberRole } from '../enums/team-member-role.enum';
import { InviteTeamMemberDto } from '../dto/invite-team-member.dto';
import { User } from '../../users/entities/user.entity';
import { EmailService } from '../../email/email.service';

@Injectable()
export class InviteTeamMemberProvider {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMembersRepository: Repository<TeamMember>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  async invite(
    teamId: string,
    dto: InviteTeamMemberDto,
    currentUserId: string,
  ): Promise<TeamMember> {
    const team = await this.teamsRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId !== currentUserId) {
      throw new BadRequestException('Only the team owner can invite members');
    }

    const invitee = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (!invitee) {
      throw new NotFoundException('User with that email not found');
    }

    if (invitee.id === currentUserId) {
      throw new BadRequestException('You cannot invite yourself');
    }

    const existingMember = await this.teamMembersRepository.findOne({
      where: { teamId, userId: invitee.id },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this team');
    }

    const memberCount = await this.teamMembersRepository.count({
      where: { teamId },
    });

    if (memberCount >= team.seatLimit) {
      throw new BadRequestException('Team seat limit reached');
    }

    const member = this.teamMembersRepository.create({
      teamId,
      userId: invitee.id,
      role: TeamMemberRole.MEMBER,
    });

    const saved = await this.teamMembersRepository.save(member);

    this.emailService
      .sendTemplateEmail(
        invitee.email,
        `You've been invited to ${team.name}`,
        'team-invite',
        { teamName: team.name },
      )
      .catch(() => void 0);

    return saved;
  }
}
