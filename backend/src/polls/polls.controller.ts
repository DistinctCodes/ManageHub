import { Controller, Get, Post, Body, Param, Req, Res, HttpStatus } from '@nestjs/common';
import { PollsService } from './polls.service';
import { Poll } from './poll.model';
import type { Request, Response } from 'express';

const ADMIN_SECRET = 'changeme'; // Change this in production

@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  createPoll(@Body() body: { question: string; adminSecret: string }, @Res() res: Response) {
    if (body.adminSecret !== ADMIN_SECRET) {
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'Forbidden' });
    }
    if (!body.question || typeof body.question !== 'string') {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid question' });
    }
    const poll = this.pollsService.createPoll(body.question, 'admin');
    return res.status(HttpStatus.CREATED).json(poll);
  }

  @Get()
  getPolls(): Poll[] {
    return this.pollsService.getPolls();
  }

  @Get(':id')
  getPoll(@Param('id') id: string, @Res() res: Response) {
    const poll = this.pollsService.getPollById(id);
    if (!poll) return res.status(HttpStatus.NOT_FOUND).json({ message: 'Poll not found' });
    return res.json(poll);
  }

  @Post(':id/vote')
  vote(
    @Param('id') id: string,
    @Body() body: { vote: 'yes' | 'no' },
    @Req() req: Request,
    @Res() res: Response
  ) {
    const identifier = req.ip;
    if (!body.vote || (body.vote !== 'yes' && body.vote !== 'no')) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid vote' });
    }
    const result = this.pollsService.vote(id, identifier, body.vote);
    if (!result.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: result.message });
    }
    return res.json({ message: result.message });
  }
} 