// backend/src/credits/credits.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { LedgerService } from './ledger.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ExecutionContext } from '@nestjs/common';

describe('CreditsController', () => {
  let controller: CreditsController;
  let creditsService: CreditsService;

  const mockCreditsService = {
    chargeCredits: jest.fn().mockResolvedValue({ success: true }),
    recordUsage: jest.fn().mockResolvedValue({ usageId: '123' }),
    getBalance: jest.fn().mockResolvedValue({ balance: 1000 }),
    getStatement: jest.fn().mockResolvedValue({ transactions: [] }),
    getUsageHistory: jest.fn().mockResolvedValue({ history: [] }),
    applyPayment: jest.fn().mockResolvedValue({ applied: true }),
  };

  const mockLedgerService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreditsController],
      providers: [
        { provide: CreditsService, useValue: mockCreditsService },
        { provide: LedgerService, useValue: mockLedgerService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'user-123', roles: ['ADMIN'] };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<CreditsController>(CreditsController);
    creditsService = module.get<CreditsService>(CreditsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('charge', () => {
    it('should call creditsService.chargeCredits with correct dto', async () => {
      const dto = { amount: 500, accountId: 'acc-1' };
      const result = await controller.charge(dto as any);
      expect(creditsService.chargeCredits).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ success: true });
    });
  });

  describe('usage (POST)', () => {
    it('should call creditsService.recordUsage', async () => {
      const dto = { amount: 50, serviceId: 'srv-1' };
      const result = await controller.recordUsage(dto as any);
      expect(creditsService.recordUsage).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ usageId: '123' });
    });
  });

  describe('balance', () => {
    it('should call creditsService.getBalance for user', async () => {
      const req = { user: { id: 'user-123' } };
      const result = await controller.getBalance(req as any);
      expect(creditsService.getBalance).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ balance: 1000 });
    });
  });

  describe('statement', () => {
    it('should call creditsService.getStatement for user', async () => {
      const req = { user: { id: 'user-123' } };
      const result = await controller.getStatement(req as any);
      expect(creditsService.getStatement).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ transactions: [] });
    });
  });

  describe('usage (GET)', () => {
    it('should call creditsService.getUsageHistory for user', async () => {
      const req = { user: { id: 'user-123' } };
      const result = await controller.getUsageHistory(req as any);
      expect(creditsService.getUsageHistory).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ history: [] });
    });
  });

  describe('applyPayment', () => {
    it('should call creditsService.applyPayment with payment id', async () => {
      const paymentId = 'pay-999';
      const result = await controller.applyPayment(paymentId);
      expect(creditsService.applyPayment).toHaveBeenCalledWith(paymentId);
      expect(result).toEqual({ applied: true });
    });
  });
});