import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletLinkIdempotencyService } from './wallet-link-idempotency.service';
import { WalletCustodyType } from './enums/wallet-custody-type.enum';
import { WalletStatus } from './enums/wallet-status.enum';

describe('WalletsController', () => {
  let controller: WalletsController;
  let walletsService: jest.Mocked<
    Pick<
      WalletsService,
      | 'getWalletStatus'
      | 'provisionCustodialWallet'
      | 'createLinkChallenge'
      | 'verifyAndLinkExternalWallet'
      | 'fundCustodialWallet'
    >
  >;
  let idempotency: { run: jest.Mock };

  const user = { id: 'user-1', role: 'USER' } as any;

  const statusView = {
    account: {
      address: 'GADDRESS',
      custodyType: WalletCustodyType.EXTERNAL,
      status: WalletStatus.ACTIVE,
    },
    balance: 0,
    currency: 'XLM',
  };

  beforeEach(() => {
    walletsService = {
      getWalletStatus: jest.fn().mockResolvedValue(statusView),
      provisionCustodialWallet: jest.fn().mockResolvedValue(undefined),
      createLinkChallenge: jest.fn().mockResolvedValue({
        nonce: 'n-1',
        expiresAt: new Date(),
        message: 'ManageHub wallet link\n...',
      }),
      verifyAndLinkExternalWallet: jest.fn().mockResolvedValue(undefined),
      fundCustodialWallet: jest.fn().mockResolvedValue(undefined),
    };
    // Pass-through by default; individual tests assert the arguments.
    idempotency = {
      run: jest.fn(async (_u, _k, _b, work: () => Promise<unknown>) => work()),
    };
    controller = new WalletsController(
      walletsService as any,
      idempotency as unknown as WalletLinkIdempotencyService,
    );
  });

  it('returns the current wallet status', async () => {
    const result = await controller.getMine(user);
    expect(walletsService.getWalletStatus).toHaveBeenCalledWith('user-1');
    expect(result.walletAddress).toBe('GADDRESS');
    expect(result.custodyType).toBe(WalletCustodyType.EXTERNAL);
  });

  it('provisions a wallet through the idempotency wrapper', async () => {
    const result = await controller.provision(user, 'idem-provision-1');

    expect(idempotency.run).toHaveBeenCalledWith(
      'user-1',
      'idem-provision-1',
      { operation: 'provision' },
      expect.any(Function),
    );
    expect(walletsService.provisionCustodialWallet).toHaveBeenCalledWith(
      'user-1',
    );
    expect(result.provisioned).toBe(true);
  });

  it('forwards the requested address to the challenge and returns the message', async () => {
    const result = await controller.requestChallenge(user, {
      address: 'GADDRESS',
    });
    expect(walletsService.createLinkChallenge).toHaveBeenCalledWith(
      'user-1',
      'GADDRESS',
    );
    expect(result.message).toContain('ManageHub wallet link');
  });

  it('verifies a link through the idempotency wrapper, keyed by the request body', async () => {
    const dto = { nonce: 'n-1', address: 'GADDRESS', signature: 'sig' };
    await controller.verifyLink(user, dto, 'idem-verify-1');

    expect(idempotency.run).toHaveBeenCalledWith(
      'user-1',
      'idem-verify-1',
      { operation: 'link/verify', ...dto },
      expect.any(Function),
    );
    expect(walletsService.verifyAndLinkExternalWallet).toHaveBeenCalledWith(
      'user-1',
      'n-1',
      'GADDRESS',
      'sig',
    );
  });

  it('replays the cached response instead of linking twice for a repeated key', async () => {
    const cached = { provisioned: true as const };
    idempotency.run.mockResolvedValueOnce(cached);

    const result = await controller.verifyLink(
      user,
      { nonce: 'n-1', address: 'GADDRESS', signature: 'sig' },
      'idem-verify-1',
    );

    expect(result).toBe(cached);
    expect(walletsService.verifyAndLinkExternalWallet).not.toHaveBeenCalled();
  });

  it('funds a wallet with the acting admin id', async () => {
    const admin = { id: 'admin-1', role: 'ADMIN' } as any;
    await controller.fund(
      '11111111-1111-4111-8111-111111111111',
      { amount: 100, reason: 'top-up' } as any,
      admin,
    );
    expect(walletsService.fundCustodialWallet).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      100,
      'top-up',
      'admin-1',
    );
  });
});
