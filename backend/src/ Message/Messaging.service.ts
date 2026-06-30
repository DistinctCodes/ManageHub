import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageThread } from './entities/message-thread.entity';
import { Message } from './entities/message.entity';
import { CreateThreadDto, SendMessageDto, MessagePaginationDto } from './dto/messaging.dto';
import { NotificationsGateway } from '../notifications/gateway/notifications.gateway';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(MessageThread)
    private readonly threadRepo: Repository<MessageThread>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  // ── POST /messages/threads ─────────────────────────────────────────────

  async createThread(dto: CreateThreadDto, currentUserId: string): Promise<MessageThread> {
    // Always include the creator in the participant list
    const participantSet = new Set([currentUserId, ...dto.participantIds]);
    const participantIds = Array.from(participantSet);

    const thread = this.threadRepo.create({ participantIds, lastMessageAt: null });
    return this.threadRepo.save(thread);
  }

  // ── GET /messages/threads ──────────────────────────────────────────────

  async listThreads(userId: string): Promise<object[]> {
    // Load threads the user participates in, with the latest message preview
    const threads = await this.threadRepo
      .createQueryBuilder('thread')
      .where(':userId = ANY(thread.participantIds)', { userId })
      .orderBy('thread.lastMessageAt', 'DESC', 'NULLS LAST')
      .getMany();

    // Fetch the last message for each thread
    const results = await Promise.all(
      threads.map(async (thread) => {
        const lastMessage = await this.messageRepo.findOne({
          where: { threadId: thread.id },
          order: { sentAt: 'DESC' },
          select: ['id', 'body', 'senderUserId', 'sentAt', 'isRead'],
        });
        return { ...thread, lastMessage: lastMessage ?? null };
      }),
    );

    return results;
  }

  // ── GET /messages/threads/:id/messages ─────────────────────────────────

  async getThreadMessages(
    threadId: string,
    userId: string,
    pagination: MessagePaginationDto,
  ): Promise<{ data: Message[]; total: number; page: number; limit: number }> {
    const thread = await this.findThreadOrThrow(threadId);
    this.assertParticipant(thread, userId);

    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;
    const skip  = (page - 1) * limit;

    const [data, total] = await this.messageRepo.findAndCount({
      where: { threadId },
      order: { sentAt: 'ASC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  // ── POST /messages/threads/:id/messages ────────────────────────────────

  async sendMessage(
    threadId: string,
    dto: SendMessageDto,
    senderUserId: string,
  ): Promise<Message> {
    const thread = await this.findThreadOrThrow(threadId);
    this.assertParticipant(thread, senderUserId);

    const message = this.messageRepo.create({
      threadId,
      senderUserId,
      body: dto.body,
    });
    const saved = await this.messageRepo.save(message);

    // Update thread.lastMessageAt
    await this.threadRepo.update(threadId, { lastMessageAt: saved.sentAt });

    // Emit new-message WebSocket event to all participants
    const payload = {
      event:    'new-message',
      threadId,
      message:  { id: saved.id, body: saved.body, senderUserId, sentAt: saved.sentAt },
    };

    for (const participantId of thread.participantIds) {
      this.notificationsGateway.server
        ?.to(`user:${participantId}`)
        .emit('new-message', payload);
    }

    return saved;
  }

  // ── PATCH /messages/threads/:id/read ──────────────────────────────────

  async markAsRead(threadId: string, userId: string): Promise<{ updated: number }> {
    const thread = await this.findThreadOrThrow(threadId);
    this.assertParticipant(thread, userId);

    const result = await this.messageRepo.update(
      { threadId, isRead: false },
      { isRead: true },
    );

    return { updated: result.affected ?? 0 };
  }

  // ── GET /messages/unread-count ─────────────────────────────────────────

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    // Find all threads the user participates in
    const threads = await this.threadRepo
      .createQueryBuilder('thread')
      .select('thread.id')
      .where(':userId = ANY(thread.participantIds)', { userId })
      .getMany();

    if (threads.length === 0) return { unreadCount: 0 };

    const threadIds = threads.map((t) => t.id);

    const unreadCount = await this.messageRepo
      .createQueryBuilder('msg')
      .where('msg.threadId IN (:...threadIds)', { threadIds })
      .andWhere('msg.isRead = false')
      .andWhere('msg.senderUserId != :userId', { userId })   // don't count own messages
      .getCount();

    return { unreadCount };
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private async findThreadOrThrow(threadId: string): Promise<MessageThread> {
    const thread = await this.threadRepo.findOne({ where: { id: threadId } });
    if (!thread) throw new NotFoundException(`Thread ${threadId} not found`);
    return thread;
  }

  private assertParticipant(thread: MessageThread, userId: string): void {
    if (!thread.participantIds.includes(userId)) {
      throw new ForbiddenException('You are not a participant in this thread');
    }
  }
}