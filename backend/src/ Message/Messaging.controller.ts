import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { User } from '../users/entities/user.entity';
import { CreateThreadDto, MessagePaginationDto, SendMessageDto } from './dto/messaging.dto';

@Controller('messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  /**
   * POST /messages/threads
   * Start a new thread with one or more participants.
   */
  @Post('threads')
  createThread(@Body() dto: CreateThreadDto, @CurrentUser() user: User) {
    return this.messagingService.createThread(dto, user.id);
  }

  /**
   * GET /messages/threads
   * List all threads for the current user, sorted by lastMessageAt desc.
   */
  @Get('threads')
  listThreads(@CurrentUser() user: User) {
    return this.messagingService.listThreads(user.id);
  }

  /**
   * GET /messages/threads/:id/messages
   * Paginated message history for a thread (participants only).
   */
  @Get('threads/:id/messages')
  getMessages(
    @Param('id', ParseUUIDPipe) threadId: string,
    @CurrentUser() user: User,
    @Query() pagination: MessagePaginationDto,
  ) {
    return this.messagingService.getThreadMessages(threadId, user.id, pagination);
  }

  /**
   * POST /messages/threads/:id/messages
   * Send a message to a thread; emits new-message WS event.
   */
  @Post('threads/:id/messages')
  sendMessage(
    @Param('id', ParseUUIDPipe) threadId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: User,
  ) {
    return this.messagingService.sendMessage(threadId, dto, user.id);
  }

  /**
   * PATCH /messages/threads/:id/read
   * Mark all unread messages in the thread as read.
   */
  @Patch('threads/:id/read')
  markRead(
    @Param('id', ParseUUIDPipe) threadId: string,
    @CurrentUser() user: User,
  ) {
    return this.messagingService.markAsRead(threadId, user.id);
  }

  /**
   * GET /messages/unread-count
   * Returns the total unread message count for badge display.
   */
  @Get('unread-count')
  unreadCount(@CurrentUser() user: User) {
    return this.messagingService.getUnreadCount(user.id);
  }
}