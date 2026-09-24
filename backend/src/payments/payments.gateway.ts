import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RequestUser } from '../auth/interfaces/authenticated-request.interface';
import { JwtTokenVerifierService } from '../auth/jwt-token-verifier.service';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentsService } from './payments.service';

function paymentRoom(paymentId: string): string {
  return `payment:${paymentId}`;
}

/**
 * Real-time push channel for payment status (issue #1571): the frontend
 * gets CONFIRMED/FAILED the instant a webhook lands, instead of only
 * finding out on next poll. Polling remains a documented fallback for
 * clients that can't hold a socket open — this gateway is additive, not a
 * replacement for GET /payments/:id.
 *
 * Client contract (issue #1812) — timeline a subscribing client should
 * expect, and when it must fall back to polling:
 *
 *  - Fast path (checkout return): `verifyOnReturn` blocks at most
 *    `PAYMENT_VERIFY_TIMEOUT_MS` (default 3000ms) against the rail, so a
 *    terminal verdict is pushed within seconds of the transition committing.
 *  - Webhook path: a provider confirmation event is applied and pushed in
 *    real time the moment it is delivered.
 *  - Reconciliation: unresolved payments are re-verified once they are
 *    `PAYMENT_RECONCILE_DUE_AFTER_MINUTES` (default 5m) old and escalate to
 *    `MANUAL_REVIEW` after `PAYMENT_MANUAL_REVIEW_AFTER_HOURS` (default 24h).
 *
 * A client that has subscribed but received no `payment:update` within 60
 * seconds SHOULD start polling `GET /payments/:id` and keep polling until
 * the payment reaches a terminal status. The socket is a latency
 * optimization, never the outcome's delivery guarantee; a dropped socket is
 * not a signal that the payment changed. See `payments/README.md`.
 */
@WebSocketGateway({
  namespace: '/payments',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class PaymentsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PaymentsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly verifier: JwtTokenVerifierService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // Guards decorate message handlers, not the initial handshake, so the JWT
  // is verified here and the socket is dropped immediately if it's missing
  // or invalid — matching the HTTP JwtAuthGuard's behavior for this domain.
  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;

    if (!token) {
      this.rejectConnection(client, 'Missing authentication token');
      return;
    }

    try {
      client.data.user = await this.verifier.verify(token);
    } catch {
      this.rejectConnection(client, 'Invalid or expired token');
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Client explicitly subscribes to one payment's updates. Reuses
   * PaymentsService.findOne's owner-or-admin check, so a socket can only
   * ever join a room for a payment it's actually allowed to see — the
   * real-time channel has the same access rules as the HTTP endpoint.
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(client: Socket, paymentId: string): Promise<void> {
    const user = client.data.user as RequestUser | undefined;
    if (!user) {
      this.rejectConnection(client, 'Not authenticated');
      return;
    }

    try {
      const payment = await this.paymentsService.findOne(paymentId, user);
      void client.join(paymentRoom(paymentId));
      client.emit('subscribed', { paymentId, status: payment.status });
    } catch {
      client.emit('subscribe:error', {
        paymentId,
        message: 'Payment not found or not accessible',
      });
    }
  }

  emitPaymentUpdate(paymentId: string, status: PaymentStatus): void {
    this.server.to(paymentRoom(paymentId)).emit('payment:update', {
      paymentId,
      status,
    });
  }

  private rejectConnection(client: Socket, reason: string): void {
    client.emit('connection:error', { message: reason });
    client.disconnect(true);
  }
}
