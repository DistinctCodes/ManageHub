import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TeamsService } from './providers/teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';

@ApiTags('teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a team' })
  async create(
    @Body() dto: CreateTeamDto,
    @GetCurrentUser('id') userId: string,
  ) {
    const team = await this.teamsService.create(dto, userId);
    return { message: 'Team created successfully', data: team };
  }

  @Post(':id/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a member by email' })
  async invite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteTeamMemberDto,
    @GetCurrentUser('id') userId: string,
  ) {
    const member = await this.teamsService.invite(id, dto, userId);
    return { message: 'Member invited successfully', data: member };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get team for the current user' })
  async findMyTeam(@GetCurrentUser('id') userId: string) {
    const team = await this.teamsService.findMyTeam(userId);
    return { message: 'Team retrieved successfully', data: team };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team details with members' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser('id') userId: string,
  ) {
    const team = await this.teamsService.findById(id, userId);
    return { message: 'Team retrieved successfully', data: team };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update team name, seatLimit, or billingEmail' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
    @GetCurrentUser('id') userId: string,
  ) {
    const team = await this.teamsService.update(id, dto, userId);
    return { message: 'Team updated successfully', data: team };
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from the team' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @GetCurrentUser('id') userId: string,
  ) {
    await this.teamsService.removeMember(id, memberId, userId);
    return { message: 'Member removed successfully' };
  }
}
