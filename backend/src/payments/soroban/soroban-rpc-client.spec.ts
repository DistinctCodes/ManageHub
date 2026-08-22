import { SorobanRpcClient, SorobanRpcServerLike } from './soroban-rpc-client';

function makeServer(overrides: Partial<SorobanRpcServerLike> = {}): SorobanRpcServerLike {
  return {
    getAccount: jest.fn(),
    simulateTransaction: jest.fn(),
    sendTransaction: jest.fn(),
    getTransaction: jest.fn(),
    ...overrides,
  };
}

describe('SorobanRpcClient', () => {
  it('rejects construction with zero endpoints', () => {
    expect(() => new SorobanRpcClient([])).toThrow();
  });

  it('uses the first healthy endpoint without touching the others', async () => {
    const primary = makeServer({
      getAccount: jest.fn().mockResolvedValue({ id: 'account-1' }),
    });
    const secondary = makeServer();
    const client = new SorobanRpcClient([primary, secondary]);

    const result = await client.getAccount('GADDR');

    expect(result).toEqual({ id: 'account-1' });
    expect(secondary.getAccount).not.toHaveBeenCalled();
  });

  it('fails over to the next endpoint when the primary is unreachable', async () => {
    const primary = makeServer({
      getTransaction: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    });
    const secondary = makeServer({
      getTransaction: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
    });
    const client = new SorobanRpcClient([primary, secondary]);

    const result = await client.getTransaction('hash-1');

    expect(result).toEqual({ status: 'SUCCESS' });
    expect(secondary.getTransaction).toHaveBeenCalledWith('hash-1');
  });

  it('retries a TRY_AGAIN_LATER send within the same endpoint before succeeding', async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce({ status: 'TRY_AGAIN_LATER' })
      .mockResolvedValueOnce({ status: 'PENDING', hash: 'h1' });
    const primary = makeServer({ sendTransaction: send });
    const client = new SorobanRpcClient([primary]);

    const result = await client.sendTransaction({} as any);

    expect(result).toEqual({ status: 'PENDING', hash: 'h1' });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('throws the last error when every endpoint fails', async () => {
    const primary = makeServer({
      simulateTransaction: jest.fn().mockRejectedValue(new Error('down-1')),
    });
    const secondary = makeServer({
      simulateTransaction: jest.fn().mockRejectedValue(new Error('down-2')),
    });
    const client = new SorobanRpcClient([primary, secondary]);

    await expect(client.simulateTransaction({} as any)).rejects.toThrow(
      'down-2',
    );
  });
});
