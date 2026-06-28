import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../../auth/interface/user.interface';
import { UserRole } from '../../users/enums/userRoles.enum';

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@WebSocketGateway({
  namespace: 'notifications',
  cors: { origin: '*' },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  private readonly connectedClients = new Map<string, string>();

  private readonly rateLimitMap = new Map<string, RateLimitEntry>();

  private readonly RATE_LIMIT_MAX = 30;

  private readonly RATE_LIMIT_WINDOW_MS = 10_000;

  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly jwtService: JwtService) {}

  afterInit(): void {
    this.logger.log('WebSocket gateway initialized');

    this.heartbeatInterval = setInterval(() => {
      this.server.sockets?.sockets?.forEach((socket) => {
        socket.emit('ping', { timestamp: Date.now() });
      });
    }, 25_000);
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string) ??
        (client.handshake.headers?.authorization as string)?.replace(
          'Bearer ',
          '',
        );

      if (!token) {
        this.logger.warn(`Connection rejected (no token): ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });

      const userId = payload.sub;

      this.connectedClients.set(client.id, userId);

      await client.join(`user:${userId}`);

      if (payload.role && ADMIN_ROLES.includes(payload.role as UserRole)) {
        await client.join('admin');
        this.logger.log(
          `Admin connected: ${client.id} (user ${userId}, role ${payload.role})`,
        );
      } else {
        this.logger.log(
          `Client connected: ${client.id} (user ${userId}${payload.role ? `, role ${payload.role}` : ''})`,
        );
      }

      client.emit('connected', {
        clientId: client.id,
        userId,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(
        `Connection rejected for ${client.id}: ${(error as Error).message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = this.connectedClients.get(client.id);
    if (userId) {
      this.logger.log(`Client disconnected: ${client.id} (user ${userId})`);
      this.connectedClients.delete(client.id);
    } else {
      this.logger.log(`Client disconnected: ${client.id}`);
    }
    this.rateLimitMap.delete(client.id);
  }

  sendToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  sendToAll(event: string, data: unknown): void {
    this.server.emit(event, data);
  }

  sendToAdmins(event: string, data: unknown): void {
    this.server.to('admin').emit(event, data);
  }

  getConnectedUsersCount(): number {
    return this.connectedClients.size;
  }

  getConnectedUsers(): Map<string, string> {
    return new Map(this.connectedClients);
  }

  isRateLimited(clientId: string): boolean {
    const now = Date.now();
    const entry = this.rateLimitMap.get(clientId);

    if (!entry || now >= entry.resetAt) {
      this.rateLimitMap.set(clientId, {
        count: 1,
        resetAt: now + this.RATE_LIMIT_WINDOW_MS,
      });
      return false;
    }

    entry.count += 1;
    if (entry.count > this.RATE_LIMIT_MAX) {
      this.logger.warn(`Rate limit exceeded for socket ${clientId}`);
      return true;
    }

    return false;
  }
}
