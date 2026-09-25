import {
  DEFAULT_GRACEFUL_SHUTDOWN_TIMEOUT_MS,
  installGracefulShutdown,
  resolveGracefulShutdownTimeout,
} from './graceful-shutdown';

type SignalHandler = (signal: NodeJS.Signals) => Promise<void>;

describe('graceful shutdown', () => {
  let handlers: Partial<Record<NodeJS.Signals, SignalHandler>>;

  beforeEach(() => {
    jest.useFakeTimers();
    handlers = {};
    jest
      .spyOn(process, 'once')
      .mockImplementation(
        ((signal: NodeJS.Signals, handler: SignalHandler) => {
          handlers[signal] = handler;
          return process;
        }) as any,
      );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('closes the server, waits for app.close, and exits successfully', async () => {
    let resolveClose!: () => void;
    const closePromise = new Promise<void>((resolve) => {
      resolveClose = resolve;
    });
    const app = { close: jest.fn(() => closePromise) };
    const server = {
      close: jest.fn(),
      closeIdleConnections: jest.fn(),
    };
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const exit = jest.fn();
    const dispose = installGracefulShutdown({
      app,
      server,
      logger,
      exit,
      timeoutMs: 1_000,
    });

    const shutdown = handlers.SIGTERM!('SIGTERM');
    await Promise.resolve();

    expect(server.close).toHaveBeenCalledTimes(1);
    expect(server.closeIdleConnections).toHaveBeenCalledTimes(1);
    expect(app.close).toHaveBeenCalledTimes(1);
    expect(exit).not.toHaveBeenCalled();

    resolveClose();
    await shutdown;

    expect(exit).toHaveBeenCalledWith(0);
    expect(logger.log).toHaveBeenCalledWith(
      'Graceful shutdown completed.',
    );
    dispose();
  });

  it('forces exit when app.close does not finish before the watchdog', async () => {
    const app = {
      close: jest.fn(() => new Promise<void>(() => undefined)),
    };
    const server = {
      close: jest.fn(),
      closeIdleConnections: jest.fn(),
    };
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const exit = jest.fn();
    const dispose = installGracefulShutdown({
      app,
      server,
      logger,
      exit,
      timeoutMs: 1_000,
    });

    void handlers.SIGINT!('SIGINT');
    await Promise.resolve();
    jest.advanceTimersByTime(1_000);

    expect(server.close).toHaveBeenCalledTimes(1);
    expect(server.closeIdleConnections).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Graceful shutdown exceeded 1000ms; forcing process exit.',
    );
    dispose();
  });

  it('ignores a duplicate signal while already draining', async () => {
    let resolveClose!: () => void;
    const closePromise = new Promise<void>((resolve) => {
      resolveClose = resolve;
    });
    const app = { close: jest.fn(() => closePromise) };
    const server = { close: jest.fn() };
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const exit = jest.fn();
    const dispose = installGracefulShutdown({
      app,
      server,
      logger,
      exit,
    });

    const firstShutdown = handlers.SIGTERM!('SIGTERM');
    await Promise.resolve();
    await handlers.SIGTERM!('SIGTERM');

    expect(app.close).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'Received SIGTERM while graceful shutdown is already draining; ignoring it.',
    );

    resolveClose();
    await firstShutdown;
    dispose();
  });

  it('uses the safe default for malformed timeout configuration', () => {
    expect(resolveGracefulShutdownTimeout(undefined)).toBe(
      DEFAULT_GRACEFUL_SHUTDOWN_TIMEOUT_MS,
    );
    expect(resolveGracefulShutdownTimeout('not-a-number')).toBe(
      DEFAULT_GRACEFUL_SHUTDOWN_TIMEOUT_MS,
    );
  });
});
