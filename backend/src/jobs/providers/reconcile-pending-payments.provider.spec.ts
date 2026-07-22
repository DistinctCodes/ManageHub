import { ReconcilePendingPaymentsProvider } from './reconcile-pending-payments.provider';

function buildProvider(payments: unknown[]) {
  const paymentsRepository = {
    find: jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(payments),
  };
  const paystackProvider = { verifyTransaction: jest.fn() };
  const paymentOutcomeProvider = {
    handleChargeSuccess: jest.fn().mockResolvedValue(undefined),
    handleChargeFailed: jest.fn().mockResolvedValue(undefined),
  };

  const provider = new ReconcilePendingPaymentsProvider(
    paymentsRepository as any,
    paystackProvider as any,
    paymentOutcomeProvider as any,
  );

  return {
    provider,
    paymentsRepository,
    paystackProvider,
    paymentOutcomeProvider,
  };
}

describe('ReconcilePendingPaymentsProvider', () => {
  it('verifies pending Paystack payments and applies successful outcomes', async () => {
    const payment = { id: 'pay-1', providerReference: 'ref-1' };
    const { provider, paystackProvider, paymentOutcomeProvider } =
      buildProvider([payment]);
    paystackProvider.verifyTransaction.mockResolvedValue({
      reference: 'ref-1',
      status: 'success',
    });

    await provider.reconcilePendingPaystackPayments();

    expect(paystackProvider.verifyTransaction).toHaveBeenCalledWith('ref-1');
    expect(paymentOutcomeProvider.handleChargeSuccess).toHaveBeenCalledWith(
      'ref-1',
      expect.objectContaining({ status: 'success' }),
      'paystack.reconciliation',
    );
  });

  it('marks verified failed charges through the shared failed path', async () => {
    const payment = { id: 'pay-1', providerReference: 'ref-1' };
    const { provider, paystackProvider, paymentOutcomeProvider } =
      buildProvider([payment]);
    paystackProvider.verifyTransaction.mockResolvedValue({
      reference: 'ref-1',
      status: 'failed',
    });

    await provider.reconcilePendingPaystackPayments();

    expect(paymentOutcomeProvider.handleChargeFailed).toHaveBeenCalledWith(
      'ref-1',
      'paystack.reconciliation',
    );
  });

  it('leaves still-pending Paystack transactions untouched', async () => {
    const payment = { id: 'pay-1', providerReference: 'ref-1' };
    const { provider, paystackProvider, paymentOutcomeProvider } =
      buildProvider([payment]);
    paystackProvider.verifyTransaction.mockResolvedValue({
      reference: 'ref-1',
      status: 'pending',
    });

    await provider.reconcilePendingPaystackPayments();

    expect(paymentOutcomeProvider.handleChargeSuccess).not.toHaveBeenCalled();
    expect(paymentOutcomeProvider.handleChargeFailed).not.toHaveBeenCalled();
  });

  it('logs payments older than the manual-review cap before reconciling eligible payments', async () => {
    const paymentsRepository = {
      find: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'stale-pay', providerReference: 'old' }])
        .mockResolvedValueOnce([]),
    };
    const provider = new ReconcilePendingPaymentsProvider(
      paymentsRepository as any,
      { verifyTransaction: jest.fn() } as any,
      {
        handleChargeSuccess: jest.fn(),
        handleChargeFailed: jest.fn(),
      } as any,
    );

    await provider.reconcilePendingPaystackPayments();

    expect(paymentsRepository.find).toHaveBeenCalledTimes(2);
  });
});
