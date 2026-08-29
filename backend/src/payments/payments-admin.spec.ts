// backend/src/payments/payments-admin.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsAdminController } from './payments-admin.controller';
import { PaymentsAdminService } from './payments-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

describe('PaymentsAdminController', () => {
  let controller: PaymentsAdminController;
  let paymentsAdminService: PaymentsAdminService;

  const mockPaymentsAdminService = {
    getManualReviewList: jest.fn().mockResolvedValue([]),
    getMetrics: jest.fn().mockResolvedValue({ totalVolume: 1000 }),
    forceReconcile: jest.fn().mockResolvedValue({ reconciled: true }),
    resolveManually: jest.fn().mockResolvedValue({ resolved: true }),
    voidPayment: jest.fn().mockResolvedValue({ voided: true }),
    refundPayment: jest.fn().mockResolvedValue({ refunded: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsAdminController],
      providers: [
        { provide: PaymentsAdminService, useValue: mockPaymentsAdminService },
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

    controller = module.get<PaymentsAdminController>(PaymentsAdminController);
    paymentsAdminService = module.get<PaymentsAdminService>(PaymentsAdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should retrieve manual review listing and metrics', async () => {
    const reviews = await controller.getManualReviewList();
    expect(paymentsAdminService.getManualReviewList).toHaveBeenCalled();
    expect(reviews).toEqual([]);

    const metrics = await controller.getMetrics();
    expect(paymentsAdminService.getMetrics).toHaveBeenCalled();
    expect(metrics).toEqual({ totalVolume: 1000 });
  });

  it('should execute force-reconcile and resolve-manually actions', async () => {
    const reconcileRes = await controller.forceReconcile('tx-1');
    expect(paymentsAdminService.forceReconcile).toHaveBeenCalledWith('tx-1');
    expect(reconcileRes).toEqual({ reconciled: true });

    const resolveRes = await controller.resolveManually('tx-1', { note: 'Resolved' } as any);
    expect(paymentsAdminService.resolveManually).toHaveBeenCalledWith('tx-1', expect.any(Object));
    expect(resolveRes).toEqual({ resolved: true });
  });

  it('should handle void and refund routes', async () => {
    const voidRes = await controller.voidPayment('tx-1');
    expect(paymentsAdminService.voidPayment).toHaveBeenCalledWith('tx-1');
    expect(voidRes).toEqual({ voided: true });

    const refundRes = await controller.refundPayment('tx-1', { amount: 50 } as any);
    expect(paymentsAdminService.refundPayment).toHaveBeenCalledWith('tx-1', expect.any(Object));
    expect(refundRes).toEqual({ refunded: true });
  });
});