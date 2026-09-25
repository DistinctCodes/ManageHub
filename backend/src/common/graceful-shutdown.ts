export const DEFAULT_GRACEFUL_SHUTDOWN_TIMEOUT_MS = 30_000;

export interface GracefulShutdownApp {
  close(): Promise<void>;
}

export interface GracefulShutdownServer {
  close(callback?: (error?: Error) => void): unknown;
  closeIdleConnections?: () => void;
}

export interface GracefulShutdownLogger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

type TimerHandle = ReturnType<typeof setTimeout>;

export interface GracefulShutdownOptions {
  app: GracefulShutdownApp;
  server: GracefulShutdownServer;
  logger: GracefulShutdownLogger;
  timeoutMs?: number;
  exit?: (code: number) => void;
  scheduleTimeout?: (callback: () => void, delayMs: number) => TimerHandle;
  cancelTimeout?: (timer: TimerHandle) => void;
}

/**
 * Resolve the watchdog duration from configuration while keeping a safe
 * default for missing, malformed, zero, or negative values.
 */
export function resolveGracefulShutdownTimeout(
  value: string | undefined,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_GRACEFUL_SHUTDOWN_TIMEOUT_MS;
  }
  return Math.max(1, Math.floor(parsed));
}

function closeHttpServer(server: GracefulShutdownServer): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const result = server.close(() => resolve());
      if (
        result &&
        typeof (result as { then?: unknown }).then === 'function'
      ) {
        void (result as PromiseLike<void>).then(
          () => resolve(),
          (error) => reject(error),
        );
        return;
      }
      if (
        !result ||
        typeof (result as { once?: unknown }).once !== 'function'
      ) {
        resolve();
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Install bounded, idempotent process-signal handling for a Nest HTTP server.
 *
 * A second signal is deliberately ignored after the first one starts the
 * drain: the watchdog remains the single escalation path, so a duplicate
 * orchestrator signal cannot run Nest lifecycle hooks twice. The disposer is
 * primarily useful for tests and for an embedding application that owns the
 * process lifecycle itself.
 */
export function installGracefulShutdown(
  options: GracefulShutdownOptions,
): () => void {
  const timeoutMs =
    options.timeoutMs &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_GRACEFUL_SHUTDOWN_TIMEOUT_MS;
  const scheduleTimeout =
    options.scheduleTimeout ??
    ((callback: () => void, delayMs: number) => setTimeout(callback, delayMs));
  const cancelTimeout =
    options.cancelTimeout ??
    ((timer: TimerHandle) => clearTimeout(timer));
  const exit = options.exit ?? ((code: number) => process.exit(code));

  let draining = false;
  let watchdog: TimerHandle | undefined;
  let forceExitRequested = false;

  const handleSignal = async (signal: NodeJS.Signals): Promise<void> => {
    if (draining) {
      options.logger.warn(
        `Received ${signal} while graceful shutdown is already draining; ignoring it.`,
      );
      return;
    }

    draining = true;
    // Re-arm this one signal so a duplicate delivery reaches the guard above
    // instead of falling through to Node's default immediate termination.
    process.once(signal, handleSignal);
    options.logger.log(
      `Received ${signal}; graceful shutdown started — draining in-flight requests.`,
    );

    watchdog = scheduleTimeout(() => {
      forceExitRequested = true;
      options.logger.error(
        `Graceful shutdown exceeded ${timeoutMs}ms; forcing process exit.`,
      );
      exit(1);
    }, timeoutMs);
    // Node 18+ exposes unref; the optional call also keeps injected test
    // timers portable while ensuring the watchdog never keeps a healthy drain
    // open by itself.
    const unrefableWatchdog = watchdog as unknown as { unref?: () => void };
    unrefableWatchdog.unref?.();

    try {
      const serverClosed = closeHttpServer(options.server);
      options.server.closeIdleConnections?.();
      await serverClosed;
      await options.app.close();
    } catch (error) {
      if (watchdog) {
        cancelTimeout(watchdog);
        watchdog = undefined;
      }
      options.logger.error(
        `Graceful shutdown failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (!forceExitRequested) {
        exit(1);
      }
      return;
    }

    if (forceExitRequested) {
      return;
    }

    if (watchdog) {
      cancelTimeout(watchdog);
      watchdog = undefined;
    }
    options.logger.log('Graceful shutdown completed.');
    exit(0);
  };

  process.once('SIGTERM', handleSignal);
  process.once('SIGINT', handleSignal);

  return () => {
    process.removeListener('SIGTERM', handleSignal);
    process.removeListener('SIGINT', handleSignal);
    if (!draining && watchdog) {
      cancelTimeout(watchdog);
      watchdog = undefined;
    }
  };
}
