import { Injectable } from '@nestjs/common';
import { Poll } from './poll.model';
// Note: randomUUID is a runtime import from Node.js 'crypto' module
import { randomUUID } from 'crypto';

@Injectable()
export class PollsService {
  private polls: Poll[] = [];

  createPoll(question: string, createdBy: string): Poll {
    const poll: Poll = {
      id: randomUUID(),
      question,
      yesCount: 0,
      noCount: 0,
      votes: [],
      createdBy,
      createdAt: new Date(),
    };
    this.polls.push(poll);
    return poll;
  }

  getPolls(): Poll[] {
    return this.polls;
  }

  getPollById(id: string): Poll | undefined {
    return this.polls.find(p => p.id === id);
  }

  vote(pollId: string, identifier: string, vote: 'yes' | 'no'): { success: boolean; message: string } {
    const poll = this.getPollById(pollId);
    if (!poll) return { success: false, message: 'Poll not found' };
    if (poll.votes.some(v => v.identifier === identifier)) {
      return { success: false, message: 'You have already voted' };
    }
    poll.votes.push({ identifier, vote });
    if (vote === 'yes') poll.yesCount++;
    else poll.noCount++;
    return { success: true, message: 'Vote recorded' };
  }
} 