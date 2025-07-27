import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternalNote } from './internal-note.entity';
import { CreateInternalNoteDto } from './dto/create-internal-note.dto';

@Injectable()
export class InternalNotesService {
  constructor(
    @InjectRepository(InternalNote)
    private readonly internalNoteRepository: Repository<InternalNote>,
  ) {}

  async createNote(dto: CreateInternalNoteDto, authorId: number): Promise<InternalNote> {
    const note = this.internalNoteRepository.create({
      content: dto.content,
      userId: dto.userId,
      authorId,
    });
    return this.internalNoteRepository.save(note);
  }

  async getNotesForUser(userId: number): Promise<InternalNote[]> {
    return this.internalNoteRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['author'],
    });
  }
}
