// backend/src/wallets/wallets.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

describe('WalletsController', () => {
  let controller: WalletsController;
  let walletsService: WalletsService;

  const mockWalletsService = {
    getWalletProfile: jest.fn().mockResolvedValue({ id: 'wallet-1' }),
    provisionWallet: jest.fn().mockResolvedValue({ provisioned: true }),
    generateLinkChallenge: jest.fn().mockResolvedValue({ challenge: 'sig-nonce' }),
    verifyLinkChallenge: jest.fn().mockResolvedValue({ linked: true }),
    fundWallet: jest.fn().mockResolvedValue({ funded: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [
        { provide: WalletsService, useValue: mockWalletsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'admin-1', role: UserRole.ADMIN };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          return req.user?.role === UserRole.ADMIN;
        },
      })
      .compile();

    controller = module.get<WalletsController>(WalletsController);
    walletsService = module.get<WalletsService>(WalletsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should retrieve wallet profile and provision wallets', async () => {
    const profile = await controller.getWalletProfile({ user: { id: 'user-1' } } as any);
    expect(walletsService.getWalletProfile).toHaveBeenCalledWith('user-1');
    expect(profile).toEqual({ id: 'wallet-1' });

    const provisionRes = await controller.provisionWallet({ user: { id: 'user-1' } } as any);
    expect(walletsService.provisionWallet).toHaveBeenCalledWith('user-1');
    expect(provisionRes).toEqual({ provisioned: true });
  });

  it('should handle link challenge generation and verification', async () => {
    const challengeRes = await controller.generateLinkChallenge({ user: { id: 'user-1' } } as any);
    expect(walletsService.generateLinkChallenge).toHaveBeenCalledWith('user-1');
    expect(challengeRes).toEqual({ challenge: 'sig-nonce' });

    const verifyRes = await controller.verifyLinkChallenge({ user: { id: 'user-1' } } as any, { signature: '0xabc' } as any);
    expect(walletsService.verifyLinkChallenge).toHaveBeenCalledWith('user-1', expect.any(Object));
    expect(verifyRes).toEqual({ linked: true });
  });

  it('should enforce admin guard on wallet funding route', async () => {
    const fundRes = await controller.fundWallet({ address: 'G123', amount: 100 } as any);
    expect(walletsService.fundWallet).toHaveBeenCalledWith('G123', 100);
    expect(fundRes).toEqual({ funded: true });
  });
});