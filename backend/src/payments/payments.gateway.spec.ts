import { PaymentsGateway } from './payments.gateway';
import { PaymentStatus } from './enums/payment-status.enum';
import { UserRole } from '../auth/enums/user-role.enum';

function makeSocket(token?: string) {
  return {
    id: 'socket-1',
    handshake: { auth: { token } },
    data: {} as Record<string, unknown>,
    join: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
}

describe('PaymentsGateway', () => {
  let verifier: { verify: jest.Mock };
  let paymentsService: { findOne: jest.Mock };
  let gateway: PaymentsGateway;

  beforeEach(() => {
    verifier = { verify: jest.fn() };
    paymentsService = { findOne: jest.fn() };
    gateway = new PaymentsGateway(verifier as any, paymentsService as any);
  });

  describe('handleConnection', () => {
    it('rejects a connection with no token', async () => {
      const socket = makeSocket(undefined);
      await gateway.handleConnection(socket as any);

      expect(socket.emit).toHaveBeenCalledWith(
        'connection:error',
        expect.objectContaining({ message: expect.any(String) }),
      );
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('rejects a connection with an invalid token', async () => {
      verifier.verify.mockRejectedValueOnce(new Error('bad token'));
      const socket = makeSocket('bad-token');

      await gateway.handleConnection(socket as any);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('attaches the decoded user for a valid token', async () => {
      verifier.verify.mockResolvedValueOnce({ id: 'user-1', role: UserRole.USER });
      const socket = makeSocket('good-token');

      await gateway.handleConnection(socket as any);

      expect(socket.data.user).toEqual({ id: 'user-1', role: UserRole.USER });
      expect(socket.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscribe', () => {
    it('rejects a subscribe attempt from an unauthenticated socket', async () => {
      const socket = makeSocket();

      await gateway.handleSubscribe(socket as any, 'payment-1');

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('joins the payment room when the user can access the payment', async () => {
      const socket = makeSocket('good-token');
      socket.data.user = { id: 'user-1', role: UserRole.USER };
      paymentsService.findOne.mockResolvedValueOnce({
        id: 'payment-1',
        status: PaymentStatus.AWAITING_CONFIRMATION,
      });

      await gateway.handleSubscribe(socket as any, 'payment-1');

      expect(socket.join).toHaveBeenCalledWith('payment:payment-1');
      expect(socket.emit).toHaveBeenCalledWith('subscribed', {
        paymentId: 'payment-1',
        status: PaymentStatus.AWAITING_CONFIRMATION,
      });
    });

    it('emits subscribe:error instead of joining when the payment is not accessible', async () => {
      const socket = makeSocket('good-token');
      socket.data.user = { id: 'user-1', role: UserRole.USER };
      paymentsService.findOne.mockRejectedValueOnce(new Error('forbidden'));

      await gateway.handleSubscribe(socket as any, 'payment-1');

      expect(socket.join).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith(
        'subscribe:error',
        expect.objectContaining({ paymentId: 'payment-1' }),
      );
    });
  });

  describe('emitPaymentUpdate', () => {
    it('emits payment:update to the payment room', () => {
      const to = jest.fn().mockReturnThis();
      const emit = jest.fn();
      (gateway as any).server = { to: to.mockReturnValue({ emit }) };

      gateway.emitPaymentUpdate('payment-1', PaymentStatus.CONFIRMED);

      expect(to).toHaveBeenCalledWith('payment:payment-1');
      expect(emit).toHaveBeenCalledWith('payment:update', {
        paymentId: 'payment-1',
        status: PaymentStatus.CONFIRMED,
      });
    });
  });
});
