// backend/src/credits/credits-admin.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CreditsAdminController } from './credits-admin.controller';
import { CreditsAdminService } from './credits-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

describe('CreditsAdminController', () => {
  let controller: CreditsAdminController;
  let adminService: CreditsAdminService;

  const mockAdminService = {
    getAccounts: jest.fn().mockResolvedValue([]),
    adjustBalance: jest.fn().mockResolvedValue({ adjusted: true }),
    verifyLedgerIntegrity: jest.fn().mockResolvedValue({ valid: true }),
    getRevenueSplits: jest.fn().mockResolvedValue([]),
    createRevenueSplit: jest.fn().mockResolvedValue({ id: 'split-1' }),
    previewRevenueSplit: jest.fn().mockResolvedValue({ preview: true }),
    activateRevenueSplit: jest.fn().mockResolvedValue({ active: true }),
    runSettlement: jest.fn().mockResolvedValue({ runId: 'run-1' }),
    getSettlementBatches: jest.fn().mockResolvedValue([]),
    executeSettlementBatch: jest.fn().mockResolvedValue({ executed: true }),
    retrySettlementBatch: jest.fn().mockResolvedValue({ retried: true }),
    abandonSettlementBatch: jest.fn().mockResolvedValue({ abandoned: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreditsAdminController],
      providers: [
        { provide: CreditsAdminService, useValue: mockAdminService },
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

    controller = module.get<CreditsAdminController>(CreditsAdminController);
    adminService = module.get<CreditsAdminService>(CreditsAdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Account Management', () => {
    it('should retrieve ledger accounts', async () => {
      const result = await controller.getAccounts();
      expect(adminService.getAccounts).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should adjust account balance', async () => {
      const dto = { accountId: 'acc-1', amount: 100, reason: 'Manual correction' };
      const result = await controller.adjustBalance(dto as any);
      expect(adminService.adjustBalance).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ adjusted: true });
    });
  });

  describe('Ledger Integrity', () => {
    it('should verify ledger balance integrity', async () => {
      const result = await controller.verifyIntegrity();
      expect(adminService.verifyLedgerIntegrity).toHaveBeenCalled();
      expect(result).toEqual({ valid: true });
    });
  });

  describe('Revenue Splits', () => {
    it('should CRUD and preview revenue splits', async () => {
      await controller.getRevenueSplits();
      expect(adminService.getRevenueSplits).toHaveBeenCalled();

      const createDto = { name: 'Split A', percentage: 20 };
      await controller.createRevenueSplit(createDto as any);
      expect(adminService.createRevenueSplit).toHaveBeenCalledWith(createDto);

      await controller.previewRevenueSplit('split-1');
      expect(adminService.previewRevenueSplit).toHaveBeenCalledWith('split-1');

      await controller.activateRevenueSplit('split-1');
      expect(adminService.activateRevenueSplit).toHaveBeenCalledWith('split-1');
    });
  });

  describe('Settlement Lifecycle', () => {
    it('should manage settlement runs and batches', async () => {
      await controller.runSettlement();
      expect(adminService.runSettlement).toHaveBeenCalled();

      await controller.getSettlementBatches();
      expect(adminService.getSettlementBatches).toHaveBeenCalled();

      await controller.executeBatch('batch-1');
      expect(adminService.executeSettlementBatch).toHaveBeenCalledWith('batch-1');

      await controller.retryBatch('batch-1');
      expect(adminService.retrySettlementBatch).toHaveBeenCalledWith('batch-1');

      await controller.abandonBatch('batch-1');
      expect(adminService.abandonSettlementBatch).toHaveBeenCalledWith('batch-1');
    });
  });
});