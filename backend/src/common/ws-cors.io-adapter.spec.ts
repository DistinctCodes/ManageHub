import { IoAdapter } from '@nestjs/platform-socket.io';
import { WsCorsIoAdapter } from './ws-cors.io-adapter';

function makeConfig(values: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string) => values[key]),
  };
}

describe('WsCorsIoAdapter (issue #1943)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function buildCors(values: Record<string, string | undefined>) {
    const config = makeConfig(values);
    const adapter = new WsCorsIoAdapter({} as any, config as any);

    // Capture the options the adapter hands to the underlying socket.io
    // server instead of opening a real port.
    const superCreate = jest
      .spyOn(IoAdapter.prototype, 'createIOServer')
      .mockReturnValue({} as any);

    adapter.createIOServer(0, { namespace: '/payments' } as any);
    const passedOptions = superCreate.mock.calls[0][1] as any;
    return passedOptions.cors as {
      credentials: boolean;
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => void;
    };
  }

  it('allows an origin present in CORS_ORIGINS and rejects one outside it', () => {
    const cors = buildCors({
      CORS_ORIGINS: 'https://app.example.com,https://admin.example.com',
      NODE_ENV: 'production',
    });

    expect(cors.credentials).toBe(true);

    const allowed = jest.fn();
    cors.origin('https://admin.example.com', allowed);
    expect(allowed).toHaveBeenCalledWith(null, true);

    const rejected = jest.fn();
    cors.origin('https://evil.example.com', rejected);
    expect(rejected.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(rejected.mock.calls[0][1]).toBe(false);
  });

  it('reads the allowlist at runtime, so .env-only configuration works', () => {
    const cors = buildCors({
      CORS_ORIGINS: 'https://from-dotenv.example.com',
      NODE_ENV: 'production',
    });

    const allowed = jest.fn();
    cors.origin('https://from-dotenv.example.com', allowed);
    expect(allowed).toHaveBeenCalledWith(null, true);
  });

  it('falls back to the development defaults when NODE_ENV is development', () => {
    const cors = buildCors({ NODE_ENV: 'development' });

    const allowed = jest.fn();
    cors.origin('http://localhost:3000', allowed);
    expect(allowed).toHaveBeenCalledWith(null, true);

    const rejected = jest.fn();
    cors.origin('https://evil.example.com', rejected);
    expect(rejected.mock.calls[0][1]).toBe(false);
  });
});
