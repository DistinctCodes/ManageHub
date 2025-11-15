import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SupportTicketsService } from './support-tickets.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
// --- Assuming you have auth setup ---
// import { GetUser } from '../auth/decorators/get-user.decorator';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../../users/entities/user.entity'; // <-- Adjust path

@Controller('support-tickets')
// @UseGuards(JwtAuthGuard) // <-- Uncomment to protect all routes
export class SupportTicketsController {
  constructor(
    private readonly supportTicketsService: SupportTicketsService,
  ) {}

  @Post()
  create(
    @Body() createSupportTicketDto: CreateSupportTicketDto,
    // @GetUser() user: User, // <-- Use your auth decorator
  ) {
    // --- Mock User: Replace this with the @GetUser() decorator ---
    const mockUser = new User();
    mockUser.id = 'replace-with-real-user-id';
    // --- End Mock User ---

    return this.supportTicketsService.create(createSupportTicketDto, mockUser);
  }

  @Get()
  findAll() {
    return this.supportTicketsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.supportTicketsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupportTicketDto: UpdateSupportTicketDto,
  ) {
    // TODO: Add authorization logic
    // (e.g., only staff can change status or assign)
    return this.supportTicketsService.update(id, updateSupportTicketDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDKeyPipe) id: string) {
    // TODO: Add authorization logic
    // (e.g., only creator or admin can delete)
    return this.supportTicketsService.remove(id);
  }
}