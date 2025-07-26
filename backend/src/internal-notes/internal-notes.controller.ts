import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { InternalNotesService } from './internal-notes.service';
import { CreateInternalNoteDto } from './dto/create-internal-note.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/internal-notes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class InternalNotesController {
  constructor(private readonly internalNotesService: InternalNotesService) {}

  @Post()
  async createNote(@Body() dto: CreateInternalNoteDto, @Request() req) {
    const authorId = req.user.id;
    const note = await this.internalNotesService.createNote(dto, authorId);
    return {
      id: note.id,
      content: note.content,
      createdAt: note.createdAt,
      author: note.author ? { id: note.author.id, name: note.author.name } : null,
      userId: note.userId,
    };
  }

  @Get(':userId')
  async getNotesForUser(@Param('userId') userId: number) {
    const notes = await this.internalNotesService.getNotesForUser(userId);
    return notes.map(note => ({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt,
      author: note.author ? { id: note.author.id, name: note.author.name } : null,
      userId: note.userId,
    }));
  }
}
