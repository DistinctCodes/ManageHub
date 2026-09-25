import { createLazy } from './lazy-initialization';

class ExampleClient {
  static constructions = 0;
  calls = 0;

  constructor() {
    ExampleClient.constructions += 1;
  }

  invoke(increment: number): number {
    this.calls += increment;
    return this.calls;
  }
}

describe('createLazy', () => {
  beforeEach(() => {
    ExampleClient.constructions = 0;
  });

  it('does not invoke the factory when a module provider resolves its value', () => {
    const factory = jest.fn(() => new ExampleClient());

    createLazy(factory);

    expect(factory).not.toHaveBeenCalled();
    expect(ExampleClient.constructions).toBe(0);
  });

  it('constructs once on first use, preserves instanceof, and forwards calls', () => {
    const factory = jest.fn(() => new ExampleClient());

    const client = createLazy(factory);

    expect(client).toBeInstanceOf(ExampleClient);
    expect(client.invoke(1)).toBe(1);
    expect(client.invoke(2)).toBe(3);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(ExampleClient.constructions).toBe(1);
    expect(client.calls).toBe(3);
  });

  it('rethrows the same factory error on every access without retrying', () => {
    const failure = new Error('RPC unavailable');
    const factory = jest.fn(() => {
      throw failure;
    });
    const client = createLazy(factory);

    expect(() => client.invoke(1)).toThrow(failure);
    expect(() => client.invoke(1)).toThrow(failure);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
