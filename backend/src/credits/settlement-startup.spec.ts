import { SettlementService } from './settlement.service';

function makeConfig(values: Record<string, unknown>) {
  return {
    get: jest.fn((key: string, fallback?: unknown) =>
      (values as any)[key] ?? fallback,
    ),
  };
}

function build(
  config: Record<string, unknown>,
  findConfigByName: jest.Mock,
): SettlementService {
  return new SettlementService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { findConfigByName } as any,
    makeConfig(config) as any,
    undefined,
    { recordReconciliationPass: jest.fn() } as any,
  );
}

describe('SettlementService.onModuleInit (CREDITS_SETTLEMENT_SPLIT_CONFIG)', () => {
  it('does nothing when the env var is not set', async () => {
    const findConfigByName = jest.fn();
    const service = build({}, findConfigByName);
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(findConfigByName).not.toHaveBeenCalled();
  });

  it('does nothing when settlement is disabled', async () => {
    const findConfigByName = jest.fn();
    const service = build(
      { CREDITS_SETTLEMENT_SPLIT_CONFIG: 'split-a', CREDITS_SETTLEMENT_ENABLED: 'false' },
      findConfigByName,
    );
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(findConfigByName).not.toHaveBeenCalled();
  });

  it('passes startup when the named config exists', async () => {
    const findConfigByName = jest.fn().mockResolvedValue({ id: 'config-1' });
    const service = build(
      { CREDITS_SETTLEMENT_SPLIT_CONFIG: 'split-a' },
      findConfigByName,
    );
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(findConfigByName).toHaveBeenCalledWith('split-a');
  });

  it('fails fast when the named config does not exist', async () => {
    const findConfigByName = jest.fn().mockResolvedValue(null);
    const service = build(
      { CREDITS_SETTLEMENT_SPLIT_CONFIG: 'typo-config' },
      findConfigByName,
    );
    await expect(service.onModuleInit()).rejects.toThrow(
      'CREDITS_SETTLEMENT_SPLIT_CONFIG="typo-config"',
    );
  });
});
