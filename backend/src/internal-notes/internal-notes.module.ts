import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalNote } from './internal-note.entity';
import { InternalNotesService } from './internal-notes.service';
import { InternalNotesController } from './internal-notes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InternalNote])],
  providers: [InternalNotesService],
  controllers: [InternalNotesController],
})
export class InternalNotesModule {}
